import 'dotenv/config';
import { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';
import { getAPIClientFromOptions, resolveEndpoint } from '../../lib/utils/api-helper.js';
import { fetchLiveMetadata, buildExperimentData } from '../../test/helpers/live-helpers.js';

const profileArg = process.argv.find(a => a.startsWith('--profile='));
const profileName = profileArg?.split('=')[1] || process.env.LIVE_PROFILE;

const client = await getAPIClientFromOptions({
  profile: profileName,
  verbose: !!process.env.VERBOSE,
});
const apiUrl = resolveEndpoint({ profile: profileName });

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
    return true;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${error instanceof Error ? error.message : error}`);
    if (error && typeof error === 'object' && 'response' in error) {
      console.error(`    Response: ${JSON.stringify((error as any).response)}`);
    }
    failed++;
    return false;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  console.log(`\nLive API tests against ${apiUrl}\n`);

  let experimentId: ExperimentId | undefined;
  let scheduledActionId: ScheduledActionId | undefined;

  console.log('Setup: Fetching metadata...');
  const meta = await fetchLiveMetadata(client);
  console.log(`  appId=${meta.appId} unitTypeId=${meta.unitTypeId} teamId=${meta.teamId} metricId=${meta.metricId}`);
  if (Object.keys(meta.customFieldValues).length > 0) {
    console.log(`  customFields: ${Object.keys(meta.customFieldValues).length} resolved`);
  }

  const experimentData = buildExperimentData(meta, '_live');
  const experimentName = experimentData.name;

  console.log('\nTests: Experiment lifecycle\n');

  try {
    await runTest('Create experiment', async () => {
      const created = await client.createExperiment(experimentData as never);
      assert(created.id !== undefined, 'Missing experiment id');
      experimentId = ExperimentId(created.id);
      console.log(`    experimentId=${experimentId}`);
    });

    if (!experimentId) throw new Error('Create failed — skipping remaining tests');

    await runTest('Get experiment', async () => {
      const exp = await client.getExperiment(experimentId!);
      assert(exp.name === experimentName, `Expected name ${experimentName}, got ${exp.name}`);
    });

    await runTest('Development mode', async () => {
      const exp = await client.developmentExperiment(experimentId!, 'live test: development');
      assert(exp.state === 'development', `Expected state development, got ${exp.state}`);
    });

    await runTest('Create scheduled action', async () => {
      const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = (await client.createScheduledAction(
        experimentId!,
        'start',
        scheduledAt,
        'live test: schedule'
      )) as { id?: number; ok?: boolean; scheduled_action?: { id: number } };
      // API may return the action directly or wrapped in { ok, scheduled_action }
      const actionId = result.id ?? result.scheduled_action?.id;
      assert(actionId !== undefined, `Missing scheduled action id in ${JSON.stringify(result)}`);
      scheduledActionId = ScheduledActionId(actionId);
      console.log(`    scheduledActionId=${scheduledActionId}`);
    });

    await runTest('Delete scheduled action', async () => {
      assert(scheduledActionId !== undefined, 'No scheduled action to delete');
      await client.deleteScheduledAction(experimentId!, scheduledActionId!);
    });

    await runTest('Start experiment', async () => {
      const exp = await client.startExperiment(experimentId!);
      assert(exp.state === 'running', `Expected state running, got ${exp.state}`);
    });

    await runTest('Stop experiment', async () => {
      const exp = await client.stopExperiment(experimentId!, 'other');
      assert(exp.state === 'stopped', `Expected state stopped, got ${exp.state}`);
    });

    await runTest('Restart experiment', async () => {
      const newExperiment = await client.restartExperiment(experimentId!, {
        reason: 'other',
        state: 'running',
        data: experimentData,
      });
      assert(newExperiment.id !== undefined, 'Restart returned no experiment');
      experimentId = ExperimentId(newExperiment.id);
      console.log(`    new experimentId=${experimentId} state=${newExperiment.state}`);
    });

    await runTest('Full-on (variant 1)', async () => {
      const exp = await client.fullOnExperiment(experimentId!, 1, 'live test: full-on');
      const fetched = await client.getExperiment(experimentId!);
      assert(fetched.full_on_variant === 1, `Expected full_on_variant=1, got ${fetched.full_on_variant}`);
    });

    await runTest('Stop (prepare for archive)', async () => {
      const exp = await client.stopExperiment(experimentId!, 'other');
      assert(exp.state === 'stopped', `Expected state stopped, got ${exp.state}`);
    });

    await runTest('Archive experiment', async () => {
      await client.archiveExperiment(experimentId!);
      const exp = await client.getExperiment(experimentId!);
      assert(exp.archived === true, `Expected archived=true, got ${exp.archived}`);
    });

    await runTest('Unarchive experiment', async () => {
      await client.archiveExperiment(experimentId!, true);
      const exp = await client.getExperiment(experimentId!);
      assert(exp.archived !== true, `Expected unarchived, got archived=${exp.archived}`);
    });

    // deleteExperiment does not exist in the API, so we archive instead
    await runTest('Archive experiment (final cleanup)', async () => {
      await client.archiveExperiment(experimentId!);
      experimentId = undefined;
    });
  } finally {
    if (experimentId) {
      console.log('\nCleanup: Archiving test experiment...');
      try {
        await client.archiveExperiment(experimentId);
        console.log('  Cleanup succeeded.');
      } catch (err) {
        console.error(
          `  Cleanup failed: ${err instanceof Error ? err.message : err}`
        );
        console.error(`  Manual cleanup needed: experiment id=${experimentId} name=${experimentName}`);
      }
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
