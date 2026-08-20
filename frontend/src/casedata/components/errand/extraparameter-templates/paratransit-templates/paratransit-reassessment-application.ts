import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { notification_UppgiftFieldTemplate } from './paratransit-notification';

const disabilityField: UppgiftField = {
  field: 'external.disabilityTypes',
  value: [],
  label: 'Ange uppgifter om funktionsnedsättning/nedsättningar',
  formField: {
    type: 'combobox',
    options: [
      { label: 'Synskada', value: 'VISION_IMPAIRMENT', name: 'disabilityTypes' },
      { label: 'Fysisk, nedsatt rörelseförmåga', value: 'PHYSICAL_MOBILITY_IMPAIRMENT', name: 'disabilityTypes' },
      { label: 'Demenssjukdom', value: 'DEMENTIA', name: 'disabilityTypes' },
      {
        label: 'Kognitiv, neuropsykiatrisk eller intellektuell funktionsnedsättning',
        value: 'COGNITIVE_NEUROPSYCHIATRIC',
        name: 'disabilityTypes',
      },
      {
        label: 'Medicinsk, kronisk och långvarig sjukdom',
        value: 'CHRONIC_MEDICAL_CONDITION',
        name: 'disabilityTypes',
      },
      { label: 'Psykisk sjukdom', value: 'MENTAL_ILLNESS', name: 'disabilityTypes' },
      { label: 'Palliativ vård', value: 'PALLIATIVE_CARE', name: 'disabilityTypes' },
    ],
  },
  section: 'Yttre omständigheter',
};

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
const medicalFields = notification_UppgiftFieldTemplate.filter(
  (field) => field.section === 'Medicinskt utlåtande' && field.field !== 'medical.diagnoses'
);

export const reassessmentApplication_UppgiftFieldTemplate: UppgiftField[] = [
  ...externalFields,
  disabilityField,
  ...currentDecisionExpiryFields,
  ...medicalFields,
];
