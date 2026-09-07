import type { DragonModule } from '../dragon-module';
import { ikSupportErrandPolicy } from './support-errand-policy';

/** IK - Intern kundtjänst. */
export const ikDragon: DragonModule = Object.freeze({
  id: 'IK',
  supportErrandPolicy: ikSupportErrandPolicy,
});
