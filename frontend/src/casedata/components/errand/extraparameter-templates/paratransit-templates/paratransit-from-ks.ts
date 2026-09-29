import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

import { baseDetails } from '../base-template';

export const paratransitFromKs_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'caseInformation',
    value: '',
    label: 'Ärendeinformation',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
];
