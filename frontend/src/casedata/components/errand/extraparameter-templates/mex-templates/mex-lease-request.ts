import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexLeaseRequest_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'reason',
    value: '',
    label: 'Vad vill du använda marken till',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'fromDate',
    value: '',
    label: 'När vill du börja använda marken',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },
  {
    field: 'toDate',
    value: '',
    label: 'När vill du sluta använda marken',
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
