import type { DragonModule } from '../dragon-module';

/** VOF uses every domain default; the module exists so the shell's registry is complete. */
export const vofDragon: DragonModule = Object.freeze({ id: 'VOF' });
