import type { DragonModule } from '../dragon-module';
import { kaSupportErrandPolicy } from './support-errand-policy';

/** KA - Kontakt Ånge. */
export const kaDragon: DragonModule = Object.freeze({
  id: 'KA',
  supportErrandPolicy: kaSupportErrandPolicy,
});
