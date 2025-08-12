import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';
import { baseParkingPermitDetails } from './parkingpermit-base';

export const parkingPermitRenewal_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  ...baseParkingPermitDetails,
  {
    field: 'application.renewal.changedCircumstances',
    value: '',
    label: 'Råder förändrade omständigheter?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'Y',
        },
        {
          label: 'Nej',
          value: 'N',
        },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'application.renewal.expirationDate',
    value: '',
    label: 'Utgångsdatum för nuvarande tillstånd',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'application.renewal.medicalConfirmationRequired',
    value: '',
    label: 'Krävs läkarintyg?',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja',
          value: 'yes',
        },
        {
          label: 'Nej',
          value: 'no',
        },
      ],
    },
    section: 'Övergripande',
  },
];
