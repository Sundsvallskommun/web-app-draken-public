import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexLandSurveyingOffice_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'otherInformation',
    value: '',
    label: 'Ärendeinformation',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'yNumber',
    value: '',
    label: 'Y-nummer',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
];
