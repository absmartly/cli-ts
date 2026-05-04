import { describe, it, expect } from 'vitest';
import { SourceSignalRegistry } from './source-signals.js';

describe('SourceSignalRegistry', () => {
  it('records entries in insertion order', () => {
    const reg = new SourceSignalRegistry();
    reg.record('experiment.participant_count', 'experiment.metrics_snapshot.rows[*].cum_unit_count');
    reg.record('alerts', 'experiment.alerts[0].type=srm');
    expect(reg.toArray()).toEqual([
      {
        covers: 'experiment.participant_count',
        source: 'experiment.metrics_snapshot.rows[*].cum_unit_count',
      },
      { covers: 'alerts', source: 'experiment.alerts[0].type=srm' },
    ]);
  });

  it('deduplicates exact (covers, source) pairs', () => {
    const reg = new SourceSignalRegistry();
    reg.record('alerts', 'experiment.alerts');
    reg.record('alerts', 'experiment.alerts');
    expect(reg.toArray()).toHaveLength(1);
  });

  it('keeps distinct entries that share only `covers`', () => {
    const reg = new SourceSignalRegistry();
    reg.record('alerts', 'experiment.alerts[0].type');
    reg.record('alerts', 'experiment.alerts[1].type');
    expect(reg.toArray()).toHaveLength(2);
  });
});
