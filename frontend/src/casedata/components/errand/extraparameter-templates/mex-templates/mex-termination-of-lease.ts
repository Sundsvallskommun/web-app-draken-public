import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexTerminationOfLease_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'reason',
    value: '',
    label: 'Ange anledning till att du önskar säga upp avtalet',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Jag behöver inte använda marken längre',
          value: 'Jag behöver inte använda marken längre',
        },
        { label: 'Jag har flyttat', value: 'Jag har flyttat' },
        { label: 'Arrendatorn har avlidit', value: 'Arrendatorn har avlidit' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'reason.other',
    value: '',
    label: 'Annan anledning',
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
