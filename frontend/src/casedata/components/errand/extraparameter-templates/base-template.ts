import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const baseDetails: UppgiftField[] = [
  {
    field: 'caseMeaning',
    value: '',
    label: 'Ärendemening',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
];
