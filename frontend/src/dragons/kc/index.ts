import type { DragonModule } from '../dragon-module';

/** KC uses every domain default; the module exists so the shell's registry is complete. */
export const kcDragon: DragonModule = Object.freeze({ id: 'KC' });
