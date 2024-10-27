import { ParsedSupportEvent, SupportEvent, SupportEvents } from '@supportmanagement/interfaces/supportEvent';
import { apiService } from '@common/services/api-service';
import dayjs from 'dayjs';

export const parseChange: (
  event: SupportEvent,
  errandId: string,
  municipalityId: string,
  keyMapper: { [key: string]: string }
) => Promise<ParsedSupportEvent> = async (event, errandId, municipalityId, keyMapper) => {
  const currentVersion = event.metadata.find((item) => item.key === 'CurrentVersion')?.value || 'unknown';
  const previousVersion = event.metadata.find((item) => item.key === 'PreviousVersion')?.value || 'unknown';
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
  // const diff = await fetchRevisionDiff(errandId, parsedChange, municipalityId, keyMapper);
  // parsedChange.parsed.diffList = diff;
};

export const getSupportErrandEvents: (
  errandId: string,
  municipalityId: string,
  keyMapper: { [key: string]: string }
) => Promise<ParsedSupportEvent[]> = (errandId, municipalityId, keyMapper) => {
  return apiService
    .get<SupportEvents>(`supporthistory/${municipalityId}/${errandId}`)
    .then((res) => {
      const ps = res.data.content.map((event) => parseChange(event, errandId, municipalityId, keyMapper));
      return Promise.all(ps);
    })
    .catch((e) => {
      console.error('Something went wrong when fetching errand events');
      throw e;
    });
};
