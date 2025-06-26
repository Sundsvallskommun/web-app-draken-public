import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexSquarePlace_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'taxBill_request',
    value: '',
    label: 'Vad gäller för dig',
    formField: {
      type: 'select',
      options: [
        { label: 'Jag har F-skattsedel och bifogar den', value: 'Jag har F-skattsedel och bifogar den' },
        {
          label: 'Jag står återkommande på torget och har tidigare skickat in F-skattsedel',
          value: 'Jag står återkommande på torget och har tidigare skickat in F-skattsedel',
        },
        { label: 'Jag har ingen F-skattsedel', value: 'Jag har ingen F-skattsedel' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'location_1',
    value: '',
    label: 'Önskad plats som förstahandsval',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'location_2',
    value: '',
    label: 'Önskad plats som andrahandsval',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'location_3',
    value: '',
    label: 'Önskad plats som tredjehandsval',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion1.fromDate',
    value: '',
    label: 'Första tillfället från',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion1.toDate',
    value: '',
    label: 'Första tillfället till',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion2.fromDate',
    value: '',
    label: 'Andra tillfället från',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion2.toDate',
    value: '',
    label: 'Andra tillfället till',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion3.fromDate',
    value: '',
    label: 'Tredje tillfället från',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion3.toDate',
    value: '',
    label: 'Tredje tillfället till',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion4.fromDate',
    value: '',
    label: 'Fjärde tillfället från',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion4.toDate',
    value: '',
    label: 'Fjärde tillfället till',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion5.fromDate',
    value: '',
    label: 'Femte tillfället från',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'occasion5.toDate',
    value: '',
    label: 'Femte tillfället till',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },

  {
    field: 'electricity',
    value: '',
    label: 'Önskas el',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'Ja' },
        { label: 'Nej', value: 'Nej' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'water_sewage',
    value: '',
    label: 'Önskas tillgång till wc, vatten och/eller sopor',
    formField: {
      type: 'radio',
      options: [
        { label: 'Ja', value: 'Ja' },
        { label: 'Nej', value: 'Nej' },
      ],
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
