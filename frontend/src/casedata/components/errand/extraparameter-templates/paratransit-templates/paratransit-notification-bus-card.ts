import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notificationBusCard_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'personal.hasParatransitDecision',
    value: '',
    label: 'Har den sökande ett utfärdat färdtjänstbeslut?',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
      ],
    },
    required: true,
    section: 'Yttre omständigheter',
  },
  {
    field: 'personal.noParatransitDecisionWarning',
    value: '',
    label: '',
    description: 'Det behöver finnas ett utfärdat färdtjänstbeslut för att få ansöka om busskort',
    formField: {
      type: 'info',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'personal.hasParatransitDecision',
        value: 'NO',
        validationMessage: '',
      },
    ],
  },
  {
    field: 'personal.needsDescription',
    value: '',
    label: 'Beskriv behoven',
    formField: {
      type: 'textarea',
    },
    section: 'Yttre omständigheter',
  },
];
