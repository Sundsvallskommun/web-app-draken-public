import type { DragonModule } from '../dragon-module';

/** MEX uses every domain default; the module exists so the shell's registry is complete. */
export const mexDragon: DragonModule = Object.freeze({ id: 'MEX' });
