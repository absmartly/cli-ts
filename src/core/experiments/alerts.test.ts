import { describe, it, expect, vi } from 'vitest';
import { listExperimentAlerts, dismissAlert } from './alerts.js';

describe('experiments/alerts', () => {
  const mockClient = {
    listExperimentAlerts: vi.fn(),
    dismissAlert: vi.fn(),
  };

  it('should list experiment alerts', async () => {
    const alerts = [{ id: 1, message: 'alert' }];
    mockClient.listExperimentAlerts.mockResolvedValue(alerts);
    const result = await listExperimentAlerts(mockClient as any, { experimentId: 10 as any });
    expect(mockClient.listExperimentAlerts).toHaveBeenCalledWith(10);
    expect(result.data).toEqual(alerts);
  });

  it('should dismiss alert', async () => {
    mockClient.dismissAlert.mockResolvedValue(undefined);
    const result = await dismissAlert(mockClient as any, { alertId: 7 as any });
    expect(mockClient.dismissAlert).toHaveBeenCalledWith(7);
    expect(result.data).toEqual({ alertId: 7 });
  });
});
