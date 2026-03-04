import 'dotenv/config';
import { APIClient } from '../../lib/api/client.js';
import { ExperimentId, ScheduledActionId } from '../../lib/api/branded-types.js';

const apiUrl = process.env.LIVE_API_URL;
const apiKey = process.env.LIVE_API_KEY;

if (!apiUrl || !apiKey) {
  console.error('Missing required environment variables:');
  if (!apiUrl) console.error('  LIVE_API_URL');
  if (!apiKey) console.error('  LIVE_API_KEY');
  console.error('\nUsage:');
  console.error(
    '  LIVE_API_URL=https://your-instance.absmartly.com/v1 LIVE_API_KEY=your-key npm run test:live'
  );
  process.exit(1);
}

const client = new APIClient(apiUrl, apiKey, { verbose: !!process.env.VERBOSE });

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

  let appId: number | undefined;
  let unitTypeId: number | undefined;
  let teamId: number | undefined;
  let metricId: number | undefined;
  let experimentId: ExperimentId | undefined;
  let scheduledActionId: ScheduledActionId | undefined;

  console.log('Setup: Fetching metadata...');

  await runTest('Fetch applications', async () => {
    const apps = await client.listApplications();
    assert(apps.length > 0, 'No applications found');
    appId = apps[0].id;
    console.log(`    applicationId=${appId} (${apps[0].name})`);
  });

  await runTest('Fetch unit types', async () => {
    const types = await client.listUnitTypes();
    assert(types.length > 0, 'No unit types found');
    unitTypeId = types[0].id;
    console.log(`    unitTypeId=${unitTypeId} (${types[0].name})`);
  });

  await runTest('Fetch teams', async () => {
    const teams = await client.listTeams();
    assert(teams.length > 0, 'No teams found');
    teamId = teams[0].id;
    console.log(`    teamId=${teamId} (${teams[0].name})`);
  });

  await runTest('Fetch metrics', async () => {
    const metrics = await client.listMetrics(1);
    assert(metrics.length > 0, 'No metrics found');
    metricId = metrics[0].id;
    console.log(`    metricId=${metricId} (${(metrics[0] as any).description || 'metric'})`);
  });

  if (appId === undefined || unitTypeId === undefined || teamId === undefined || metricId === undefined) {
    console.error('\nSetup failed — cannot proceed without metadata.');
    process.exit(1);
  }

  console.log('\nTests: Experiment lifecycle\n');

  const experimentName = `cli_live_test_${Date.now()}`;

  const experimentData = {
    name: experimentName,
    display_name: 'CLI Live Test',
    type: 'test',
    teams: [{ team_id: teamId }],
    unit_type: { unit_type_id: unitTypeId },
    applications: [{ application_id: appId, application_version: '1' }],
    primary_metric: { metric_id: metricId },
    secondary_metrics: [] as never[],
    owners: [] as never[],
    experiment_tags: [] as never[],
    variants: [
      { name: 'control', variant: 0, config: '{}' },
      { name: 'treatment', variant: 1, config: '{}' },
    ],
    variant_screenshots: [] as never[],
    percentages: '50/50',
    nr_variants: 2,
    percentage_of_traffic: 100,
    analysis_type: 'fixed_horizon',
    required_alpha: 0.05,
    required_power: 0.8,
    audience: '{}',
    minimum_detectable_effect: '5',
  };

  try {
    // 1. Create
    await runTest('Create experiment', async () => {
      const created = await client.createExperiment(experimentData as never);
      assert(created.id !== undefined, 'Missing experiment id');
      experimentId = ExperimentId(created.id);
      console.log(`    experimentId=${experimentId}`);
    });

    if (!experimentId) throw new Error('Create failed — skipping remaining tests');

    // 2. Get
    await runTest('Get experiment', async () => {
      const exp = await client.getExperiment(experimentId!);
      assert(exp.name === experimentName, `Expected name ${experimentName}, got ${exp.name}`);
    });

    // 3. Development mode
    await runTest('Development mode', async () => {
      const exp = await client.developmentExperiment(experimentId!, 'live test: development');
      assert(exp.state === 'development', `Expected state development, got ${exp.state}`);
    });

    // 4. Create scheduled action (must be in development/ready state)
    await runTest('Create scheduled action', async () => {
      const scheduledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const result = (await client.createScheduledAction(
        experimentId!,
        'start',
        scheduledAt,
        'live test: schedule'
      )) as { ok?: boolean; scheduled_action?: { id: number } };
      assert(result.ok === true, `Expected ok=true, got ${JSON.stringify(result)}`);
      assert(result.scheduled_action?.id !== undefined, 'Missing scheduled action id');
      scheduledActionId = ScheduledActionId(result.scheduled_action.id);
      console.log(`    scheduledActionId=${scheduledActionId}`);
    });

    // 5. Delete scheduled action
    await runTest('Delete scheduled action', async () => {
      assert(scheduledActionId !== undefined, 'No scheduled action to delete');
      await client.deleteScheduledAction(experimentId!, scheduledActionId!);
    });

    // 6. Start
    await runTest('Start experiment', async () => {
      const exp = await client.startExperiment(experimentId!);
      assert(exp.state === 'running', `Expected state running, got ${exp.state}`);
    });

    // 7. Stop
    await runTest('Stop experiment', async () => {
      const exp = await client.stopExperiment(experimentId!, 'other');
      assert(exp.state === 'stopped', `Expected state stopped, got ${exp.state}`);
    });

    // 8. Restart
    await runTest('Restart experiment', async () => {
      const result = (await client.rawRequest(
        `/experiments/${experimentId}/restart`,
        'PUT',
        { reason: 'other', state: 'running', data: experimentData }
      )) as { ok: boolean; new_experiment?: { id: number; state: string }; errors: string[] };
      assert(result.ok === true, `Expected ok=true, errors: ${result.errors?.join(', ')}`);
      assert(result.new_experiment !== undefined, 'Restart returned no new_experiment');
      experimentId = ExperimentId(result.new_experiment!.id);
      console.log(`    new experimentId=${experimentId} state=${result.new_experiment!.state}`);
    });

    // 9. Full-on (variant 1)
    await runTest('Full-on (variant 1)', async () => {
      const exp = await client.fullOnExperiment(experimentId!, 1, 'live test: full-on');
      const fetched = await client.getExperiment(experimentId!);
      assert(fetched.full_on_variant === 1, `Expected full_on_variant=1, got ${fetched.full_on_variant}`);
    });

    // 10. Stop (prepare for archive)
    await runTest('Stop (prepare for archive)', async () => {
      const exp = await client.stopExperiment(experimentId!, 'other');
      assert(exp.state === 'stopped', `Expected state stopped, got ${exp.state}`);
    });

    // 11. Archive
    await runTest('Archive experiment', async () => {
      await client.archiveExperiment(experimentId!);
      const exp = await client.getExperiment(experimentId!);
      assert(exp.archived === true, `Expected archived=true, got ${exp.archived}`);
    });

    // 12. Unarchive
    await runTest('Unarchive experiment', async () => {
      await client.archiveExperiment(experimentId!, true);
      const exp = await client.getExperiment(experimentId!);
      assert(exp.archived !== true, `Expected unarchived, got archived=${exp.archived}`);
    });

    // 13. Archive experiment (cleanup — deleteExperiment does not exist in the API)
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
