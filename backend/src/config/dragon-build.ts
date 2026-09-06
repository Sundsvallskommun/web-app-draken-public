import dragons from '../../../dragons.json';

export type DragonId = keyof typeof dragons;

/** Identity is fixed by the entrypoint; a runtime flag cannot select another application. */
export const assertDragonBuild = (builtIdentity: DragonId, identity = process.env.APPLICATION): void => {
  if (!identity || !Object.hasOwn(dragons, identity)) throw new Error(`Unknown dragon "${identity ?? ''}".`);
  if (identity !== builtIdentity) throw new Error(`This backend was built for ${builtIdentity}; APPLICATION=${identity}.`);
};
