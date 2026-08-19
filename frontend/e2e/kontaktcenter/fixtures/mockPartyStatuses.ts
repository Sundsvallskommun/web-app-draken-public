// Ärendestatusar för ärendeägaren (partyId 'aaaaaaa-bbbb-aaaa-bbbb-aaaabbbbcccc' i
// mockSupportErrand). Backend svarar med { data, message }, så fixturerna har samma form —
// annars läser tjänstelagret res.data.data som undefined och listorna ser tomma ut oavsett kod.
const ongoingErrand = {
  caseId: 'e1111111-1111-1111-1111-111111111111',
  caseType: 'MEX_LEASE_REQUEST',
  status: 'Under behandling',
  externalStatus: 'Handläggning pågår',
  firstSubmitted: '2024-06-11 10:39',
  lastStatusChange: '2024-06-12 10:39',
  system: 'CASE_DATA',
  namespace: 'SBK_MEX',
  errandNumber: 'MEX-2024-000351',
};

const closedErrand = {
  caseId: 'e2222222-2222-2222-2222-222222222222',
  caseType: 'MEX_BUY_SMALL_HOUSE_PLOT',
  status: 'Klart',
  externalStatus: 'Avslutat',
  firstSubmitted: '2024-02-01 09:00',
  lastStatusChange: '2024-03-01 09:00',
  system: 'CASE_DATA',
  namespace: 'SBK_MEX',
  errandNumber: 'MEX-2024-000123',
};

// Samma id som mockSupportErrand — kundbilden och räknaren ska filtrera bort det ärende
// handläggaren redan står i.
const currentErrand = {
  caseId: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490',
  caseType: 'MEX_LEASE_REQUEST',
  status: 'Under behandling',
  externalStatus: 'Handläggning pågår',
  firstSubmitted: '2024-06-01 10:39',
  lastStatusChange: '2024-06-01 10:39',
  system: 'SUPPORT_MANAGEMENT',
  namespace: 'CONTACTSUNDSVALL',
  errandNumber: 'KC-00000001',
};

export const mockPartyStatusErrands = { ongoingErrand, closedErrand, currentErrand };

export const mockPartyStatuses = {
  data: [ongoingErrand, closedErrand, currentErrand],
  message: 'success',
};

export const mockEmptyResolvedRelations = {
  data: { relations: [], caseStatuses: [] },
  message: 'success',
};

// En relation från det aktuella ärendet till ärendeägarens pågående ärende.
export const mockResolvedRelationsWithLink = {
  data: {
    relations: [
      {
        id: 'r1111111-1111-1111-1111-111111111111',
        type: 'LINK',
        source: { resourceId: 'c9a96dcb-24b1-479b-84cb-2cc0260bb490', type: 'case', service: 'supportmanagement' },
        target: { resourceId: ongoingErrand.caseId, type: 'case', service: 'case-data', namespace: 'SBK_MEX' },
      },
    ],
    caseStatuses: [ongoingErrand],
  },
  message: 'success',
};
