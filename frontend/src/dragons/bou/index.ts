import type { DragonModule } from '../dragon-module';
import { bouSupportErrandPolicy } from './support-errand-policy';

/** BOU - Barn och utbildningsförvaltningen. */
export const bouDragon: DragonModule = Object.freeze({
  id: 'BOU',
  supportErrandPolicy: bouSupportErrandPolicy,
});
