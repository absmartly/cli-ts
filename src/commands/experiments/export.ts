import { Command } from 'commander';
import chalk from 'chalk';
import {
  getAPIClientFromOptions,
  getGlobalOptions,
  withErrorHandling,
} from '../../lib/utils/api-helper.js';
import { parseExperimentId } from '../../lib/utils/validators.js';
import type { ExperimentId } from '../../lib/api/branded-types.js';
import { ExportConfigId } from '../../api-client/types.js';
import { exportExperiment } from '../../core/experiments/export.js';
import { fetchExportStatus } from '../../core/experiments/export-wait.js';
import { startPolling } from '../../lib/utils/polling.js';

export const exportCommand = new Command('export')
  .description('Export experiment data')
  .argument('<id>', 'experiment ID', parseExperimentId)
  .option('--wait', 'wait for export to complete and show download URL')
  .option('--interval <seconds>', 'poll interval in seconds', '5')
  .action(
    withErrorHandling(async (id: ExperimentId, options) => {
      const globalOptions = getGlobalOptions(exportCommand);
      const client = await getAPIClientFromOptions(globalOptions);
      const result = await exportExperiment(client, { experimentId: id });

      console.log(chalk.green(`✓ Experiment ${id} data export initiated`));

      if (!options.wait) return;

      const intervalSeconds = parseInt(options.interval, 10);
      if (isNaN(intervalSeconds) || intervalSeconds < 1) {
        throw new Error('Interval must be a positive integer');
      }

      const exportConfigId = ExportConfigId(result.data.exportConfigId);
      console.log(chalk.gray(`Export config ID: ${exportConfigId}`));
      console.log(chalk.gray(`Polling every ${intervalSeconds}s... Press Ctrl+C to stop\n`));

      let poller: { stop: () => void } | null = null;

      const fetchAndDisplay = async () => {
        const status = await fetchExportStatus(client, exportConfigId);

        process.stdout.write('\r\x1b[K');

        if (status.status === 'COMPLETED') {
          console.log(chalk.green('✓ Export completed!'));
          if (status.exportedRows > 0) {
            console.log(chalk.gray(`  Exported rows: ${status.exportedRows}`));
          }
          if (status.downloadUrl) {
            console.log(chalk.bold(`\n  Download URL: ${status.downloadUrl}\n`));
          }
          poller?.stop();
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
