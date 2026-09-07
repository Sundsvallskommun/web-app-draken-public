import type { DragonModule } from '../dragon-module';
import { robSupportErrandPolicy } from './support-errand-policy';

/** ROB - Rekrytering och bemanning. */
export const robDragon: DragonModule = Object.freeze({
  id: 'ROB',
  supportErrandPolicy: robSupportErrandPolicy,
});
