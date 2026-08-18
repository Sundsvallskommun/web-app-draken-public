// Shape returned by the backend's SupportNotificationDto, i.e. the subscriber based notification
// model. `acknowledged` is a timestamp (absent while unacknowledged), not a boolean.
export const mockNotifications = [
  {
    id: 'bb893d57-04e9-44af-a271-aff5df530bba',
    created: '2024-04-30T07:09:18.712+02:00',
    expires: '2024-10-30T23:30:00Z',
    errandId: '403740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000001',
    eventType: 'UPDATE',
    subType: 'MESSAGE',
    description: 'Meddelande mottaget',
  },
  // Same errand, same subtype, minutes apart — the panel merges these two into one group.
  {
    id: 'bb893d57-04e9-44af-a271-aff5df530cca',
    created: '2024-04-30T07:29:18.712+02:00',
    expires: '2024-10-30T23:30:00Z',
    errandId: '403740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000001',
    eventType: 'UPDATE',
    subType: 'MESSAGE',
    description: 'Meddelande mottaget',
  },
  {
    id: 'cc893d57-04e9-44af-a271-aff5df530dda',
    created: '2024-04-29T11:15:00.000+02:00',
    expires: '2024-10-30T23:30:00Z',
    errandId: '503740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000002',
    eventType: 'CREATE',
    subType: 'ATTACHMENT',
    description: 'En bilaga har lagts till i ärendet.',
  },
  // Upstream does not guarantee eventType/subType/description — plenty of real notifications carry
  // none of them, and the panel has to stay readable anyway.
  {
    id: 'ee893d57-04e9-44af-a271-aff5df530ffa',
    created: '2024-04-28T09:00:00.000+02:00',
    expires: '2024-10-30T23:30:00Z',
    errandId: '603740f0-1ca7-4e26-9023-683f2029ccea',
    errandNumber: 'KC-2024-000003',
  },
];

