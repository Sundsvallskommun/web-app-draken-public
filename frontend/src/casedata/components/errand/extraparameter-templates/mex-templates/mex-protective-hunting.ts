import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexProtectiveHunting_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'sightingLocation',
    value: '',
    label: 'Var sågs det skadade djuret',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'sightingTime',
    value: '',
    label: 'När sågs det skadade djuret',
    formField: {
      type: 'datetime-local',
    },
    section: 'Övergripande',
  },
  {
    field: 'urgent',
    value: '',
    label: 'Är det brådskande',
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
