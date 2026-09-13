import type { DragonModule } from '../dragon-module';
import { seSupportErrandPolicy } from './support-errand-policy';

/** SE - Servicecenter Ekonomi. */
export const seDragon: DragonModule = Object.freeze({
  id: 'SE',
  supportErrandPolicy: seSupportErrandPolicy,
});
