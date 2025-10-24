import { apiService } from '@common/services/api-service';
import { ParsedSupportEvent, SupportEvent, SupportEvents } from '@supportmanagement/interfaces/supportEvent';
import dayjs from 'dayjs';

export const parseChange: (
  event: SupportEvent,
  errandId: string,
  keyMapper: { [key: string]: string }
) => Promise<ParsedSupportEvent> = async (event) => {
  const currentVersion = event.metadata.find((item) => item.key === 'CurrentVersion')?.value || 'unknown';
  const executedBy = event.metadata.find((item) => item.key === 'ExecutedBy')?.value || 'unknown';
  const p = {
    ...event,
    parsed: {
      event: event.message,
      datetime: dayjs(event.created).format('YYYY-MM-DD HH:mm:ss'),
      version: currentVersion,
      executedBy: executedBy,
    },
  } as ParsedSupportEvent;
  return p;
};

export const getSupportErrandEvents: (
  errandId: string,
  keyMapper: { [key: string]: string }
) => Promise<ParsedSupportEvent[]> = (errandId, keyMapper) => {
  return apiService
    .get<SupportEvents>(`supporthistory/${errandId}`)
    .then((res) => {
      const ps = res.data.content.map((event) => parseChange(event, errandId, keyMapper));
      return Promise.all(ps);
    })
    .catch((e) => {
      console.error('Something went wrong when fetching errand events');
      throw e;
    });
};
