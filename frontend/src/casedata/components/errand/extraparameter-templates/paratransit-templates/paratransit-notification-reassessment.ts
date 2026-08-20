import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { notification_UppgiftFieldTemplate } from './paratransit-notification';

const currentDecisionExpiryFields: UppgiftField[] = [
  {
    field: 'external.currentDecisionExpiryTitle',
    value: '',
    label: 'När upphör det nuvarande beslutet?',
    formField: {
      type: 'info',
    },
    section: 'Yttre omständigheter',
  },
  {
    field: 'external.currentDecisionExpiryDate',
    value: '',
    label: 'Datum då beslutet upphör',
    formField: {
      type: 'date',
    },
    section: 'Yttre omständigheter',
    disabledBy: {
      field: 'external.currentDecisionExpiryDateMissing',
      value: 'YES',
    },
  },
  {
    field: 'external.currentDecisionExpiryDateMissing',
    value: '',
    label: '',
    formField: {
      type: 'checkbox',
      options: [{ label: 'Datum saknas', value: 'YES' }],
    },
    required: false,
    section: 'Yttre omständigheter',
  },
];

const externalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Yttre omständigheter');
const medicalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Medicinskt utlåtande');

export const notificationReassessment_UppgiftFieldTemplate: UppgiftField[] = [
  ...externalFields,
  ...currentDecisionExpiryFields,
  ...medicalFields,
];
