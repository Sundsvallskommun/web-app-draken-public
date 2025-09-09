import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexHuntingLease_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'reason',
    value: '',
    label: 'Varför vill du säga upp ditt avtal',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'fromDate',
    value: '',
    label: 'Från vilket datum önskar du säga upp avtalet',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },
  {
    field: 'otherInformation',
    value: '',
    label: 'Övrigt',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
];
