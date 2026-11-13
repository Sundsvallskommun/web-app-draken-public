import { apiService } from './api-service';

export interface KpiIndex {
  indexYear: number;
  indexNumber: number;
}

/** The year whose October KPI is used by default: the previous year. */
export const defaultKpiIndexYear = (): number => new Date().getFullYear() - 1;

/** Fetches the KPI 80 value for October of the given year (default: the previous year) from SCB. */
export const getKpiIndex = (indexYear: number = defaultKpiIndexYear()): Promise<KpiIndex> => {
  const url = `billingdatacollector/kpi?baseYear=KPI_80&period=${indexYear}-10`;

  return apiService
    .get<{ baseYear: string; period: string; value: number }>(url)
    .then((res) => {
      if (typeof res.data?.value !== 'number') {
        throw new Error(`No KPI value for October ${indexYear}`);
      }
      return { indexYear, indexNumber: res.data.value };
    })
    .catch((e) => {
      console.error('Something went wrong when fetching KPI index: ' + e);
      throw e;
    });
};

export const getNextScheduledBillingDate = (contractId: string): Promise<string | null> => {
  if (!contractId) {
    return Promise.resolve(null);
  }
  const url = `billingdatacollector/${contractId}`;

  return apiService
    .get<string>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching next scheduled billing: ' + e);
      throw e;
    });
};
