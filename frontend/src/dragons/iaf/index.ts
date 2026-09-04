import type { DragonModule } from '../dragon-module';

/** IAF uses every domain default; the module exists so the shell's registry is complete. */
export const iafDragon: DragonModule = Object.freeze({ id: 'IAF' });
