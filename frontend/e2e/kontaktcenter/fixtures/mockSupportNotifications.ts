import { mockSupportErrand } from './mockSupportErrands';

// Shape returned by the backend's SupportNotificationDto, i.e. the subscriber based notification
// model. One notification per errand, carrying every event since the user last acknowledged, newest
// first. `acknowledged` is a timestamp (absent while unacknowledged), not a boolean.
export const mockNotifications = [
  {
    id: 'bb893d57-04e9-44af-a271-aff5df530bba',
    created: '2024-04-30T07:29:18.712+02:00',
    errandId: '403740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000001',
    // Two messages on the same errand — the panel collapses them into one expandable row.
    events: [
      {
        created: '2024-04-30T07:29:18.712+02:00',
        eventType: 'UPDATE',
        subType: 'MESSAGE',
        description: 'Meddelande mottaget',
      },
      {
        created: '2024-04-30T07:09:18.712+02:00',
        eventType: 'UPDATE',
        subType: 'MESSAGE',
        description: 'Meddelande mottaget',
      },
    ],
  },
  {
    id: 'cc893d57-04e9-44af-a271-aff5df530dda',
    created: '2024-04-29T11:15:00.000+02:00',
    errandId: '503740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000002',
    events: [
      {
        created: '2024-04-29T11:15:00.000+02:00',
        eventType: 'CREATE',
        subType: 'ATTACHMENT',
        description: 'En bilaga har lagts till i ärendet.',
      },
    ],
  },
  // No description, so the label has to be derived from subType and eventType. A removed attachment
  // must not read as "Ny bilaga".
  {
    id: 'ff893d57-04e9-44af-a271-aff5df530aab',
    created: '2024-04-28T14:20:00.000+02:00',
    errandId: '703740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000004',
    events: [{ created: '2024-04-28T14:20:00.000+02:00', eventType: 'DELETE', subType: 'ATTACHMENT' }],
  },
  // Upstream guarantees neither events nor their subType/description — plenty of real notifications
  // carry none of them, and the panel has to stay readable anyway.
  {
    id: 'ee893d57-04e9-44af-a271-aff5df530ffa',
    created: '2024-04-28T09:00:00.000+02:00',
    errandId: '603740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000003',
    events: [],
  },
];

// The event deliberately lines up with the first event in mockSupportHistory (same subtype, same
// timestamp) so the errand log can resolve which event the notification came from. Once upstream
// puts an id on notification events this can point at the event directly instead. The errand id must
// be the log's own errand; the log ignores other errands' notifications.
export const mockNotificationsForErrandLog = [
  {
    id: 'dd893d57-04e9-44af-a271-aff5df530eea',
    created: '2024-05-22T10:58:50.405+02:00',
    errandId: mockSupportErrand.id,
    errandNumber: mockSupportErrand.errandNumber,
    events: [
      {
        created: '2024-05-22T10:58:50.405+02:00',
        eventType: 'DELETE',
        subType: 'NOTE',
        description: 'Notering borttagen',
      },
    ],
  },
];

export const mockAcknowledgeResult = {
  acknowledged: ['bb893d57-04e9-44af-a271-aff5df530bba'],
  failed: [],
};
