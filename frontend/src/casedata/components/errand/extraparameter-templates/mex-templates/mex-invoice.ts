import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexInvoice_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'invoiceNumber',
    value: '',
    label: 'Fakturanummer',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'invoiceRecipient',
    value: '',
    label: 'Vem är fakturan utställd på',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'otherInformation',
    value: '',
    label: 'Ärendeinformation',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
];
