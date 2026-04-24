import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listExperiments } from './list.js';

vi.mock('../../api-client/experiment-summary.js', () => ({
  summarizeExperimentRow: vi.fn().mockImplementation((e: Record<string, unknown>) => ({
    id: e.id,
    name: e.name,
  })),
}));

vi.mock('../../lib/utils/date-parser.js', () => ({
  parseDateFlagOrUndefined: vi.fn().mockReturnValue(undefined),
}));

describe('list', () => {
  let mockClient: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      listExperiments: vi.fn().mockResolvedValue([
        { id: 1, name: 'Exp A' },
        { id: 2, name: 'Exp B' },
      ]),
    };
  });

  it('calls listExperiments with page and items', async () => {
    await listExperiments(mockClient as any, { items: 25, page: 1 });
    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, items: 25, previews: true })
    );
  });

  it('returns summarized rows by default', async () => {
    const result = await listExperiments(mockClient as any, { items: 25, page: 1 });
    expect(result.rows).toEqual([
      { id: 1, name: 'Exp A' },
      { id: 2, name: 'Exp B' },
    ]);
  });

  it('returns raw experiments when raw=true', async () => {
    const result = await listExperiments(mockClient as any, { items: 25, page: 1, raw: true });
    expect(result.rows).toEqual([
      { id: 1, name: 'Exp A' },
      { id: 2, name: 'Exp B' },
    ]);
  });

  it('includes pagination info', async () => {
    const result = await listExperiments(mockClient as any, { items: 25, page: 2 });
    expect(result.pagination).toEqual({ page: 2, items: 25, hasMore: false });
  });

  it('sets hasMore=true when results fill the page', async () => {
    const fullPage = Array.from({ length: 10 }, (_, i) => ({ id: i, name: `Exp ${i}` }));
    mockClient.listExperiments.mockResolvedValue(fullPage);
    const result = await listExperiments(mockClient as any, { items: 10, page: 1 });
    expect(result.pagination!.hasMore).toBe(true);
  });

  it('passes filter options to client', async () => {
    await listExperiments(mockClient as any, {
      items: 25,
      page: 1,
      state: 'running',
      type: 'experiment',
      app: 'web',
      search: 'test',
      sort: 'created_at',
      asc: true,
    });
    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'running',
        type: 'experiment',
        application: 'web',
        search: 'test',
        sort: 'created_at',
        ascending: true,
      })
    );
  });

  it('passes desc as ascending=false', async () => {
    await listExperiments(mockClient as any, { items: 25, page: 1, desc: true });
    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({ ascending: false })
    );
  });

  it('passes alert flags', async () => {
    await listExperiments(mockClient as any, {
      items: 25,
      page: 1,
      alertSrm: true,
      alertCleanupNeeded: '0',
    });
    expect(mockClient.listExperiments).toHaveBeenCalledWith(
      expect.objectContaining({
        alert_srm: 1,
        alert_cleanup_needed: 0,
      })
    );
  });
});
