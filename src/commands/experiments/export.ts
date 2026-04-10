import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
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
import { downloadFile } from '../../lib/utils/download.js';

function isExportInProgressError(error: unknown): boolean {
  if (!(error instanceof APIError) || error.statusCode !== 400) return false;

  const response = error.response as Record<string, unknown> | undefined;
  const errors = Array.isArray(response?.errors) ? (response.errors as string[]) : [];
  const errorText = errors.join(' ');

  return errorText.includes('already in progress') || errorText.includes('recently created');
}

function formatAge(isoDate: string): string {
  const seconds = Math.round((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

async function performDownload(
  downloadUrl: string,
  fileKey: string,
  authHeader: string,
  resume: boolean
): Promise<void> {
  const outputPath = path.resolve(fileKey);

  let spinnerFrame = 0;
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  const result = await downloadFile({
    url: downloadUrl,
    outputPath,
    resume,
    headers: { Authorization: authHeader },
    onProgress: (downloaded, total) => {
      const frame = spinnerFrames[spinnerFrame++ % spinnerFrames.length];
      if (total) {
        const pct = Math.round((downloaded / total) * 100);
        const bar = renderProgressBar(pct);
        process.stdout.write(
          `\r\x1b[K${chalk.cyan(frame)} Downloading ${fileKey}  ${bar} ${pct}% (${formatBytes(downloaded)} / ${formatBytes(total)})`
        );
      } else {
        process.stdout.write(
          `\r\x1b[K${chalk.cyan(frame)} Downloading ${fileKey}  ${formatBytes(downloaded)}`
        );
      }
    },
  });

  process.stdout.write('\r\x1b[K');

  if (result.resumed) {
    console.log(
      chalk.green(`✓ Download resumed and completed: ./${fileKey} (${formatBytes(result.bytes)})`)
    );
  } else {
    console.log(chalk.green(`✓ Downloaded: ./${fileKey} (${formatBytes(result.bytes)})`));
  }
}

export const exportCommand = new Command('export')
  .description('Export experiment data')
  .argument('<id>', 'experiment ID or name', parseExperimentIdOrName)
  .option('--wait', 'wait for export to complete and show download URL')
  .option('--download', 'download the export file to the current directory (implies --wait)')
  .option('--resume', 'resume a partial download of the most recent export')
  .option('--new', 'skip checking for recent exports and start a new one')
  .option('--interval <seconds>', 'poll interval in seconds', '2')
  .action(
    withErrorHandling(async (nameOrId: string, options) => {
      const globalOptions = getGlobalOptions(exportCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const id = await client.resolveExperimentId(nameOrId);

      // --download and --resume imply --wait
      if (options.download || options.resume) options.wait = true;

      // --resume: find recent export and resume download immediately
      if (options.resume) {
        const recent = await findRecentDownload(client, id, { includeExpired: true });
        if (recent) {
          const fileKey = recent.downloadUrl.split('/').pop()!;
          console.log(chalk.gray(`Resuming download of ${fileKey}...`));
          try {
            await performDownload(recent.downloadUrl, fileKey, client.getAuthHeader(), true);
            return;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('404')) {
              console.log(
                chalk.yellow(`⚠ File has expired. Starting a new export...\n`)
              );
              // Fall through to normal export + download flow
              options.download = true;
            } else {
              throw err;
            }
          }
        } else {
          console.log(chalk.yellow(`⚠ No recent export found. Starting a new export...\n`));
          options.download = true;
        }
      }

      // Check for a recent completed export with a download link
      if (!options.new) {
        const recent = await findRecentDownload(client, id);
        if (recent) {
          console.log(chalk.green(`✓ A recent export is already available`));
          console.log(
            chalk.gray(
              `  Generated: ${formatDate(recent.downloadCreatedAt)} (${formatAge(recent.downloadCreatedAt)})`
            )
          );
          console.log(chalk.bold(`\n  Download URL: ${recent.downloadUrl}\n`));

          if (options.download) {
            const startNew = await confirm({
              message: 'Download this export? (No = start a new export)',
              default: true,
            });

            if (startNew) {
              const fileKey = recent.downloadUrl.split('/').pop()!;
              await performDownload(recent.downloadUrl, fileKey, client.getAuthHeader(), false);
              return;
            }
            console.log('');
          } else {
            const startNew = await confirm({
              message: 'Start a new export anyway?',
              default: false,
            });

            if (!startNew) return;
            console.log('');
          }
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
              chalk.yellow(
                `⚠ Export already in progress — attaching to export config ${exportConfigId}`
              )
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
      let pollSpinnerFrame = 0;
      const pollSpinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let spinnerTimer: ReturnType<typeof setInterval> | null = null;
      let completedAt: number | null = null;
      let resolvePolling: ((url: string) => void) | null = null;
      let rejectPolling: ((err: Error) => void) | null = null;

      const pollingDone = new Promise<string>((resolve, reject) => {
        resolvePolling = resolve;
        rejectPolling = reject;
      });

      const startSpinner = (label: string) => {
        stopSpinner();
        spinnerTimer = setInterval(() => {
          process.stdout.write(
            `\r\x1b[K${chalk.cyan(pollSpinnerFrames[pollSpinnerFrame++ % pollSpinnerFrames.length])} ${chalk.gray(label)}`
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
          resolvePolling!(status.downloadUrl);
          return;
        }

        if (status.status === 'COMPLETED') {
          if (!completedAt) completedAt = Date.now();
          const elapsed = Math.round((Date.now() - completedAt) / 1000);
          startSpinner(
            `Export completed — waiting for download link... (${formatEta(elapsed)} elapsed)`
          );
          return;
        }

        if (status.status === 'FAILED' || status.status === 'CANCELLED') {
          stopSpinner();
          process.stdout.write('\r\x1b[K');
          console.error(chalk.red(`✗ Export ${status.status.toLowerCase()}`));
          poller?.stop();
          if (options.download) {
            rejectPolling!(new Error(`Export ${status.status.toLowerCase()}`));
          } else {
            process.exit(1);
          }
          return;
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
            status.status === 'WAITING' ? 'Waiting for export to start...' : 'Preparing export...';
          startSpinner(label);
        }
      };

      await fetchAndDisplay();

      poller = startPolling({
        intervalMs: intervalSeconds * 1000,
        onTick: fetchAndDisplay,
      });

      if (options.download) {
        const downloadUrl = await pollingDone;
        const fileKey = downloadUrl.split('/').pop()!;
        await performDownload(downloadUrl, fileKey, client.getAuthHeader(), false);
      }
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
