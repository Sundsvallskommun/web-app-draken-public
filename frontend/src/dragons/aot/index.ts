import type { DragonModule } from '../dragon-module';

/** AOT uses every domain default; the module exists so the shell's registry is complete. */
export const aotDragon: DragonModule = Object.freeze({ id: 'AOT' });
