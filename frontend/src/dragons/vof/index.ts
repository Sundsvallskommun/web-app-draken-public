import { kontaktSundsvallSupportErrandPolicy } from '@supportmanagement/policy/support-errand-policy';

import { avvikelseSchemaFields } from '../../avvikelse/form-fields/facility-search-field.component';
import type { DragonModule } from '../dragon-module';

export const vofDragon: DragonModule = Object.freeze({
  id: 'VOF',
  schemaFields: avvikelseSchemaFields,
  supportErrandPolicy: kontaktSundsvallSupportErrandPolicy,
});
