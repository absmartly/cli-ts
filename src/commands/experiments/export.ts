import { Command } from 'commander';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { ExportConfigId } from '../../api-client/types.js';
import { APIError } from '../../api-client/http-client.js';
import { exportExperiment } from '../../core/experiments/export.js';
import {
  fetchExportStatus,
  findActiveExportConfig,
  findRecentDownload,
} from '../../core/experiments/export-wait.js';
import { startPolling } from '../../lib/utils/polling.js';

function isExportInProgressError(error: unknown): boolean {
  if (!(error instanceof APIError) || error.statusCode !== 400) return false;

  const response = error.response as Record<string, unknown> | undefined;
  const errors = Array.isArray(response?.errors) ? (response.errors as string[]) : [];
  const errorText = errors.join(' ');

  return (
    errorText.includes('already in progress') || errorText.includes('recently created')
  );
}

function formatAge(isoDate: string): string {
  const seconds = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export const exportCommand = new Command('export')
  .description('Export experiment data')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--wait', 'wait for export to complete and show download URL')
  .option('--new', 'skip checking for recent exports and start a new one')
  .option('--interval <seconds>', 'poll interval in seconds', '2')
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(exportCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      // Check for a recent completed export with a download link
      if (!options.new) {
        const recent = await findRecentDownload(client, id);
        if (recent) {
          console.log(
            chalk.green(`✓ A recent export is already available (${formatAge(recent.downloadCreatedAt)})`)
          );
          console.log(chalk.bold(`\n  Download URL: ${recent.downloadUrl}\n`));

          const startNew = await confirm({
            message: 'Start a new export anyway?',
            default: false,
          });

          if (!startNew) return;
          console.log('');
        }
      }

      let exportConfigId: ReturnType<typeof ExportConfigId>;

      try {
        const result = await exportExperiment(client, { experimentId: id });
        exportConfigId = ExportConfigId(result.data.exportConfigId);
        console.log(chalk.green(`✓ Experiment ${id} data export initiated`));
      } catch (error) {
        if (options.wait && isExportInProgressError(error)) {
          const existing = await findActiveExportConfig(client, id);
          if (existing) {
            exportConfigId = ExportConfigId(existing.id);
            console.log(
              chalk.yellow(`⚠ Export already in progress — attaching to export config ${exportConfigId}`)
            );
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }

      if (!options.wait) return;

      const intervalSeconds = parseInt(options.interval, 10);
      if (isNaN(intervalSeconds) || intervalSeconds < 1) {
        throw new Error('Interval must be a positive integer');
      }

      console.log(chalk.gray(`Export config ID: ${exportConfigId}`));
      console.log(chalk.gray(`Polling every ${intervalSeconds}s... Press Ctrl+C to stop\n`));

      let poller: { stop: () => void } | null = null;
      let spinnerFrame = 0;
      const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let spinnerTimer: ReturnType<typeof setInterval> | null = null;
      let completedAt: number | null = null;

      const startSpinner = (label: string) => {
        stopSpinner();
        spinnerTimer = setInterval(() => {
          process.stdout.write(
            `\r\x1b[K${chalk.cyan(spinnerFrames[spinnerFrame++ % spinnerFrames.length])} ${chalk.gray(label)}`
          );
        }, 80);
      };

      const stopSpinner = () => {
        if (spinnerTimer) {
          clearInterval(spinnerTimer);
          spinnerTimer = null;
        }
      };

      const fetchAndDisplay = async () => {
        const status = await fetchExportStatus(client, exportConfigId);

        if (status.status === 'COMPLETED' && status.downloadUrl) {
          stopSpinner();
          process.stdout.write('\r\x1b[K');
          console.log(chalk.green('✓ Export completed!'));
          if (status.exportedRows > 0) {
            console.log(chalk.gray(`  Exported rows: ${status.exportedRows}`));
          }
          console.log(chalk.bold(`\n  Download URL: ${status.downloadUrl}\n`));
          poller?.stop();
          return;
        }

        if (status.status === 'COMPLETED') {
          if (!completedAt) completedAt = Date.now();
          const elapsed = Math.round((Date.now() - completedAt) / 1000);
          startSpinner(`Export completed — waiting for download link... (${formatEta(elapsed)} elapsed)`);
          return;
        }

        if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          stopSpinner();
          process.stdout.write('\r\x1b[K');
          console.error(chalk.red(`✗ Export ${status.status.toLowerCase()}`));
          poller?.stop();
          process.exit(1);
        }

        if (status.progress > 0 || status.exportedRows > 0) {
          stopSpinner();
          process.stdout.write('\r\x1b[K');
          const progressBar = renderProgressBar(status.progress);
          const eta =
            status.remainingSeconds > 0 ? ` ETA: ${formatEta(status.remainingSeconds)}` : '';
          const rows =
            status.exportedRows > 0
              ? ` (${status.exportedRows}${status.totalRows > 0 ? `/${status.totalRows}` : ''} rows)`
              : '';

          process.stdout.write(
            `${chalk.gray(status.status)} ${progressBar} ${status.progress}%${rows}${eta}`
          );
        } else {
          const label =
            status.status === 'WAITING'
              ? 'Waiting for export to start...'
              : 'Preparing export...';
          startSpinner(label);
        }
      };

      await fetchAndDisplay();

      poller = startPolling({
        intervalMs: intervalSeconds * 1000,
        onTick: fetchAndDisplay,
      });
    })
  );

function renderProgressBar(progress: number): string {
  const width = 20;
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}
