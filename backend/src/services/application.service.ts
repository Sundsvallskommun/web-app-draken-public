export const isIK = () => process.env.APPLICATION === 'IK';

export const isLOP = () => process.env.APPLICATION === 'LOP';

export const isMSVA = () => process.env.APPLICATION === 'MSVA';

export const isROB = () => process.env.APPLICATION === 'ROB';

export const isKC = () => process.env.APPLICATION === 'KC';

export const isKA = () => process.env.APPLICATION === 'KA';

export const isPT = () => process.env.APPLICATION === 'PT';

export const isMEX = () => process.env.APPLICATION === 'MEX';

export const isSE = () => process.env.APPLICATION === 'SE';

export const isBOU = () => process.env.APPLICATION === 'BOU';

const CONTACTSUNDSVALL_NAMESPACE = 'CONTACTSUNDSVALL';

// True when this deployment is the Kontakt Sundsvall drake: APPLICATION=KC AND the CONTACTSUNDSVALL
// supportmanagement namespace (defense in depth — no single misconfiguration flips it). CONTACTSUNDSVALL
// is always a supportmanagement namespace, never a casedata one. Used at login to grant the
// canViewOtherNamespaces permission; validateEnv warns if APPLICATION is KC but the namespace is missing.
export const isContactSundsvall = () => isKC() && process.env.SUPPORTMANAGEMENT_NAMESPACE === CONTACTSUNDSVALL_NAMESPACE;
