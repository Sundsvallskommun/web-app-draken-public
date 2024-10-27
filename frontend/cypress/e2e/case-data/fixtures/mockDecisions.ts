import { DecisionOutcome, DecisionType } from '@casedata/interfaces/decision';

export const mockRecommendedDecision = {
  data: {
    id: 29,
    version: 0,
    created: '2022-12-13T13:36:02.720874+01:00',
    updated: '2022-12-13T13:36:02.720888+01:00',
    validFrom: '2022-12-13T13:36:02.720874+01:00',
    validTo: '2022-12-13T13:36:02.720888+01:00',
    decisionType: 'RECOMMENDED' as DecisionType,
    decisionOutcome: 'APPROVAL' as DecisionOutcome,
    description:
      'Personen är boende i Sundsvalls kommun. Nuvarande kontroll ger rekommenderat beslut att godkänna ansökan.',
    law: [],
    attachments: [],
    extraParameters: {},
  },
  message: 'success',
};

export const mockProposedDecision = {
  data: {
    id: 29,
    version: 0,
    created: '2022-12-13T13:36:02.720874+01:00',
    updated: '2022-12-13T13:36:02.720888+01:00',
    validFrom: '2022-12-13T13:36:02.720874+01:00',
    validTo: '2022-12-13T13:36:02.720888+01:00',
    decisionType: 'PROPOSED' as DecisionType,
    decisionOutcome: 'APPROVAL' as DecisionOutcome,
    description: 'Utredningstext',
    law: [],
    attachments: [],
    extraParameters: {},
  },
  message: 'success',
};
