import type { DragonModule } from '../dragon-module';

/** PT uses every domain default; the module exists so the shell's registry is complete. */
export const ptDragon: DragonModule = Object.freeze({ id: 'PT' });
