import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexApplicationForRoadAllowance_UppgiftFieldTempalte: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'applicantType',
    value: '',
    label: 'Ansöker som',
    formField: {
      type: 'radio',
      options: [
        { label: 'Privatperson', value: 'Privatperson' },
        { label: 'Representant för förening', value: 'Representant för förening' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'roadType',
    value: '',
    label: 'Ansökan gäller',
    formField: {
      type: 'radio',
      options: [
        { label: 'Enskild väg med stadsbidrag', value: 'Enskild väg med statsbidrag' },
        { label: 'Enskild väg UTAN stadsbidrag', value: 'Enskild väg UTAN statsbidrag' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'registrationAddressStatus',
    value: '',
    label: 'Sökandes folkbokföring',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Ja jag är folkbokförd',
          value: 'Ja jag är folkbokförd',
        },
        {
          label: 'Nej jag är inte folkbokförd',
          value: 'Nej jag är inte folkbokförd',
        },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'otherInformation',
    value: '',
    label: 'Information om vägen',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.type',
    value: '',
    label: 'Typ av konto',
    formField: {
      type: 'radio',
      options: [
        { label: 'Bankgiro', value: 'Bankgiro' },
        { label: 'Plusgiro', value: 'Plusgiro' },
        { label: 'Bankkonto (endast privatperson)', value: 'Bankkonto' },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'account.number',
    value: '',
    label: 'Giro-nummer',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.owner',
    value: '',
    label: 'Giro-ägare',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.bank',
    value: '',
    label: 'Bank',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.owner',
    value: '',
    label: 'Kontoägare',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.ownerIdentifier',
    value: '',
    label: 'Kontoägarens personnummer',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'account.number',
    value: '',
    label: 'Kontonummer',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
];
