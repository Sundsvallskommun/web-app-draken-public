import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';

export const notificationRiak_UppgiftFieldTemplate: UppgiftField[] = [
  {
    field: 'personal.disabilityDescription',
    value: '',
    label: 'Beskriv funktionsnedsättningen',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.mobilityAids',
    value: '',
    label: 'Ange hjälpmedel vid förflyttning',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.destination',
    value: '',
    label: 'Ange resmål',
    formField: {
      type: 'textarea',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.numberOfTrips',
    value: '',
    label: 'Ange antal resor ärendet gäller',
    formField: {
      type: 'text',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.tripPeriodStart',
    value: '',
    label: 'Reseperiod - från',
    formField: {
      type: 'date',
    },
    section: 'Personlig information',
  },
  {
    field: 'personal.tripPeriodEnd',
    value: '',
    label: 'Reseperiod - till',
    formField: {
      type: 'date',
    },
    section: 'Personlig information',
  },
];
