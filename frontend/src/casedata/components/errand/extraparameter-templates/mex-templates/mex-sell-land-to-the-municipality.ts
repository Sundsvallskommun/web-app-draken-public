import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';

export const mexSellLandToTheMunicipality_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  {
    field: 'reason',
    value: '',
    label: 'Beskriv anledningen eller hur det kommer sig att du vill sälja marken',
    formField: {
      type: 'textarea',
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
