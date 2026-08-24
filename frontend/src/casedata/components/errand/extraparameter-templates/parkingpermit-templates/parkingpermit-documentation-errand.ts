import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { baseDetails } from '../base-template';

export const documentationErrand_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'documentation.caseInformation',
    value: '',
    label: 'Ärendeinformation',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
];
