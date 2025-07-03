import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';
import { baseParkingPermitDetails } from './parkingpermit-base';

export const lostParkingPermit_UppgiftFieldTemplate: UppgiftField[] = [
  ...baseDetails,
  ...baseParkingPermitDetails,
  {
    field: 'application.lostPermit.policeReportNumber',
    value: '',
    label: 'Diarie/ärendenummer för polisanmälan',
    formField: {
      type: 'text',
    },
    section: 'Övergripande',
  },
];
