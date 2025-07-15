import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const parkingPermitAppeal_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'application.appeal.type',
    value: '',
    label: 'Typ av överklagan',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Överklagar beslut',
          value: 'appeal_decision',
        },
        {
          label: 'Överklagar rättidsprövning',
          value: 'appeal_time',
        },
        {
          label: 'Kommunen överklagar',
          value: 'appeal_municipality',
        },
      ],
    },
    section: 'Övergripande',
  },
  {
    field: 'application.appeal.date',
    value: '',
    label: 'Ange datum överklagan inkom till kommunen',
    formField: {
      type: 'date',
    },
    section: 'Övergripande',
  },
  {
    field: 'application.appeal.recivedintime',
    value: '',
    label: 'Rättidsprövning',
    formField: {
      type: 'radio',
      options: [
        {
          label: 'Överklagan inkom i rätt tid',
          value: 'true',
        },
        {
          label: 'Överklagan inkom inte i rätt tid',
          value: 'false',
        },
      ],
      inline: true,
    },
    section: 'Övergripande',
  },
  {
    field: 'application.appeal.extra',
    value: '',
    label: 'Övrig information',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
];
