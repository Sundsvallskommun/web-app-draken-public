import type { DragonModule } from '../dragon-module';
import { lokSupportErrandPolicy } from './support-errand-policy';

/** LOK - Lokalplanering. */
export const lokDragon: DragonModule = Object.freeze({
  id: 'LOK',
  supportErrandPolicy: lokSupportErrandPolicy,
});
