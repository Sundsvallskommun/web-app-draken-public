export const isKC = () => process.env.APPLICATION === 'KC';

export const isPT = () => process.env.APPLICATION === 'PT';

export const isMEX = () => process.env.APPLICATION === 'MEX';

const CONTACTSUNDSVALL_NAMESPACE = 'CONTACTSUNDSVALL';

// True when this deployment is the Kontakt Sundsvall drake: APPLICATION=KC AND the CONTACTSUNDSVALL
// supportmanagement namespace (defense in depth — no single misconfiguration flips it). CONTACTSUNDSVALL
// is always a supportmanagement namespace, never a casedata one. Used at login to grant the
// canViewOtherNamespaces permission; validateEnv warns if APPLICATION is KC but the namespace is missing.
export const isContactSundsvall = () => isKC() && process.env.SUPPORTMANAGEMENT_NAMESPACE === CONTACTSUNDSVALL_NAMESPACE;
