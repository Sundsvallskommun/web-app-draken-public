import type { DragonModule } from '../dragon-module';
import { lopSupportErrandPolicy } from './support-errand-policy';

/** LOP - Lön och Pension. */
export const lopDragon: DragonModule = Object.freeze({
  id: 'LOP',
  supportErrandPolicy: lopSupportErrandPolicy,
});
