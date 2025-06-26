import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexBuyLandFromTheMunicipality_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'errandInformation',
    value: '',
    label: 'Vad vill du använda marken till',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'typeOfEstablishment',
    value: '',
    label: 'Vilken typ av verksamhet gäller förfrågan',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'jobOpportunities',
    value: '',
    label: 'Kommer din etablering att generera arbetstillfällen. I så fall hur många',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'constructionOfBuildings',
    value: '',
    label: 'Vill ni uppföra byggnader',
    formField: {
      type: 'textarea',
    },
    section: 'Övergripande',
  },
  {
    field: 'landArea',
    value: '',
    label: 'Hur stor markyta behövs',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'electricity',
    value: '',
    label: 'Är verksamheten elintensiv',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
  {
    field: 'timetable',
    value: '',
    label: 'När behöver ni marken',
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
