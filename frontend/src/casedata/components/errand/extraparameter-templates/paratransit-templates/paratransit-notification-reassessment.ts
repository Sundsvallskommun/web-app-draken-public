import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { notification_UppgiftFieldTemplate } from './paratransit-notification';

const currentDecisionExpiryFields: UppgiftField[] = [
  {
    field: 'external.currentDecisionExpiryKnown',
    value: '',
    label: 'Ange datum nuvarande beslut upphör',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ange datum', value: 'YES' },
        { label: 'Vet ej', value: 'UNKNOWN' },
      ],
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.currentDecisionExpiryDate',
    value: '',
    label: 'Datum nuvarande beslut upphör',
    formField: {
      type: 'date',
    },
    section: 'Yttre omständigheter',
    dependsOn: [
      {
        field: 'external.currentDecisionExpiryKnown',
        value: 'YES',
        validationMessage: 'Ange datum för när nuvarande beslut upphör.',
      },
    ],
  },
];

const externalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Yttre omständigheter');
const medicalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Medicinskt utlåtande');

export const notificationReassessment_UppgiftFieldTemplate: UppgiftField[] = [
  ...externalFields,
  ...currentDecisionExpiryFields,
  ...medicalFields,
];
