import { apiService } from './api-service';

export interface KpiIndex {
  indexYear: number;
  indexNumber: number;
}

export const getKpiIndex = (): Promise<KpiIndex> => {
  const previousYear = new Date().getFullYear() - 1;
  const period = `${previousYear}-10`;
  const url = `billingdatacollector/kpi?baseYear=KPI_80&period=${period}`;

  return apiService
    .get<{ baseYear: string; period: string; value: number }>(url)
    .then((res) => ({
      indexYear: previousYear,
      indexNumber: res.data.value,
    }))
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
