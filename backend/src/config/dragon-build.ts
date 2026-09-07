import dragons from '../../../dragons.json';

export type DragonId = keyof typeof dragons;
export type DragonDomain = 'casedata' | 'supportmanagement';

/** The catalog owns domain identity, including for dragons added after the original applications. */
export const getDragonDomain = (identity = process.env.APPLICATION): DragonDomain => {
  if (!identity || !Object.hasOwn(dragons, identity)) throw new Error(`Unknown dragon "${identity ?? ''}".`);
  const domain = dragons[identity as DragonId].domain;
  if (domain !== 'casedata' && domain !== 'supportmanagement') throw new Error(`Unsupported domain for dragon ${identity}.`);
  return domain;
};

/** Identity is fixed by the entrypoint; a runtime flag cannot select another application. */
export const assertDragonBuild = (builtIdentity: DragonId, identity = process.env.APPLICATION): void => {
  if (!identity || !Object.hasOwn(dragons, identity)) throw new Error(`Unknown dragon "${identity ?? ''}".`);
  if (identity !== builtIdentity) throw new Error(`This backend was built for ${builtIdentity}; APPLICATION=${identity}.`);
};
