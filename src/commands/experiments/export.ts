import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentIdOrName } from './resolve-id.js';
import { ExportConfigId } from '../../api-client/types.js';
import { APIError } from '../../api-client/http-client.js';
import { exportExperiment } from '../../core/experiments/export.js';
import { fetchExportStatus, findActiveExportConfig } from '../../core/experiments/export-wait.js';
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

export const exportCommand = new Command('export')
  .description('Export experiment data')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--wait', 'wait for export to complete and show download URL')
  .option('--interval <seconds>', 'poll interval in seconds', '5')
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(exportCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

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

      const fetchAndDisplay = async () => {
        const status = await fetchExportStatus(client, exportConfigId);

        process.stdout.write('\r\x1b[K');

        if (status.status === 'COMPLETED' && status.downloadUrl) {
          console.log(chalk.green('✓ Export completed!'));
          if (status.exportedRows > 0) {
            console.log(chalk.gray(`  Exported rows: ${status.exportedRows}`));
          }
          console.log(chalk.bold(`\n  Download URL: ${status.downloadUrl}\n`));
          poller?.stop();
          return;
        }

        if (status.status === 'COMPLETED') {
          process.stdout.write(
            `${chalk.gray('COMPLETED')} — waiting for download link...`
          );
          return;
        }

        if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          console.error(chalk.red(`✗ Export ${status.status.toLowerCase()}`));
          poller?.stop();
          process.exit(1);
        }

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
