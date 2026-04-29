import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { changeQuestions } from './paratransit-change-questions';
import { notification_UppgiftFieldTemplate } from './paratransit-notification';

const medicalFields = notification_UppgiftFieldTemplate.filter((field) => field.section === 'Medicinskt utlåtande');

const disabilityField: UppgiftField = {
  field: 'external.disabilityTypes',
  value: [],
  label: 'Uppgifter om funktionsnedsättning/nedsättningar',
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

export const changeApplication_UppgiftFieldTemplate: UppgiftField[] = [
  ...changeQuestions,
  disabilityField,
  ...medicalFields,
];
