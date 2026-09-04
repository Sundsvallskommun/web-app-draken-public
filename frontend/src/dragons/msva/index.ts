import type { DragonModule } from '../dragon-module';

/** MSVA uses every domain default; the module exists so the shell's registry is complete. */
export const msvaDragon: DragonModule = Object.freeze({ id: 'MSVA' });
