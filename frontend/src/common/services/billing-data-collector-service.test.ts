import { apiService } from '@common/services/api-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { defaultKpiIndexYear, getKpiIndex } from './billing-data-collector-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn() } }));

/** An axios response from the KPI endpoint with the given body. */
const kpiResponse = (data: Record<string, unknown>) => ({ data } as never);

beforeEach(() => {
  vi.mocked(apiService.get).mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getKpiIndex', () => {
  test('looks up the October KPI 80 value of the given year', async () => {
    vi.mocked(apiService.get).mockResolvedValue(kpiResponse({ baseYear: 'KPI_80', period: '2023-10', value: 408.12 }));

    await expect(getKpiIndex(2023)).resolves.toEqual({ indexYear: 2023, indexNumber: 408.12 });
    expect(apiService.get).toHaveBeenCalledWith('billingdatacollector/kpi?baseYear=KPI_80&period=2023-10');
  });

  test('uses October of the previous year by default', async () => {
    vi.mocked(apiService.get).mockResolvedValue(kpiResponse({ value: 419.35 }));
    const previousYear = new Date().getFullYear() - 1;

    expect(defaultKpiIndexYear()).toBe(previousYear);
    await expect(getKpiIndex()).resolves.toEqual({ indexYear: previousYear, indexNumber: 419.35 });
    expect(apiService.get).toHaveBeenCalledWith(`billingdatacollector/kpi?baseYear=KPI_80&period=${previousYear}-10`);
  });

  test('rejects an answer without a KPI value', async () => {
    vi.mocked(apiService.get).mockResolvedValue(kpiResponse({ baseYear: 'KPI_80', period: '2030-10' }));

    await expect(getKpiIndex(2030)).rejects.toThrow('No KPI value for October 2030');
  });

  test('rejects when the lookup fails', async () => {
    vi.mocked(apiService.get).mockRejectedValue(new Error('404'));

    await expect(getKpiIndex(1985)).rejects.toThrow('404');
  });
});
