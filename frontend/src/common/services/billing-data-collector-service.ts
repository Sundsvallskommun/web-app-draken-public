import { apiService } from './api-service';

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
