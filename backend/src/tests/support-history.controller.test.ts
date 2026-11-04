import { SupportHistoryController } from '@/controllers/supportmanagement/support-history.controller';
import { Event, PageEvent } from '@/data-contracts/supportmanagement/data-contracts';

import { mockReq, mockRes } from './helpers/http';
import { mockAdUsername, mockCitizenPartyId, mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

const CITIZEN_NAME = 'Name Of Citizen';
const EMPLOYEE_NAME = 'Name Of Employee';

const eventBy = (id: string, executedBy?: string): Event => ({
  id,
  metadata: [{ key: 'Namespace', value: 'NAMESPACE' }, ...(executedBy ? [{ key: 'ExecutedBy', value: executedBy }] : [])],
});

const makeController = (events: Event[]) => {
  const controller = new SupportHistoryController();
  const api = { get: vi.fn(async () => ({ data: { totalElements: events.length, content: events } as PageEvent, message: 'success' })) };
  const personNames = {
    getNameByIdentifier: vi.fn(async (_municipalityId: string, identifier: string) =>
      identifier === mockCitizenPartyId ? CITIZEN_NAME : EMPLOYEE_NAME,
    ),
  };
  (controller as unknown as { apiService: typeof api }).apiService = api;
  (controller as unknown as { personNameService: typeof personNames }).personNameService = personNames;
  return { controller, personNames };
};

const fetchEvents = async (controller: SupportHistoryController) => {
  const res = mockRes<PageEvent>();
  await controller.fetchSupportEvents(mockReq(), mockSupportErrandId, mockMunicipalityId, 0, 100, '', res as never);
  return res.body as Omit<PageEvent, 'content'> & { content: (Event & { executedByName?: string })[] };
};

describe('SupportHistoryController', () => {
  describe('fetching events', () => {
    it('adds the name of who did it to each event and keeps the rest of the page', async () => {
      const { controller } = makeController([eventBy('from-citizen', mockCitizenPartyId), eventBy('from-employee', mockAdUsername)]);

      const page = await fetchEvents(controller);

      expect(page.totalElements).toBe(2);
      expect(page.content.map(event => event.executedByName)).toEqual([CITIZEN_NAME, EMPLOYEE_NAME]);
      expect(page.content[0].metadata).toContainEqual({ key: 'ExecutedBy', value: mockCitizenPartyId });
    });

    it('looks each identifier up only once', async () => {
      const { controller, personNames } = makeController([
        eventBy('first', mockAdUsername),
        eventBy('second', mockAdUsername),
        eventBy('third', mockCitizenPartyId),
      ]);

      await fetchEvents(controller);

      expect(personNames.getNameByIdentifier).toHaveBeenCalledTimes(2);
    });

    it('leaves the name out of an event that does not say who did it', async () => {
      const { controller, personNames } = makeController([eventBy('nobody')]);

      const page = await fetchEvents(controller);

      expect(page.content[0].executedByName).toBeUndefined();
      expect(personNames.getNameByIdentifier).not.toHaveBeenCalled();
    });
  });
});
