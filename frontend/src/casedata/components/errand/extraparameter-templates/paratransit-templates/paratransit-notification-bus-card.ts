import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notificationBusCard_UppgiftFieldTemplate: UppgiftField[] = [
  //TODO: Check if valid paratransit is active. Only show this if the awnser is yes.
  {
    field: 'personal.busCardForEscort',
    value: '',
    label: 'Busskort gäller ledsagare/följeslagare',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'YES' },
        { label: 'Nej', value: 'NO' },
      ],
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.caseDescription',
    value: '',
    label: 'Ärendebeskrivning',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
];
