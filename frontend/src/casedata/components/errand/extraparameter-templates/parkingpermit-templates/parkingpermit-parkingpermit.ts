import { UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { baseDetails } from '../base-template';
import { baseParkingPermitDetails } from './parkingpermit-base';

export const parkingPermit_UppgiftFieldTemplate: UppgiftField[] = [...baseDetails, ...baseParkingPermitDetails];
