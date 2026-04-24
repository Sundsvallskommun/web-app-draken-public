// String() prevents the minifier from folding placeholder comparisons at build time.
// This ensures entrypoint.sh can replace placeholders in the built files at runtime.
const APP = String(import.meta.env.VITE_APPLICATION || '');
const ENV = String(import.meta.env.VITE_ENVIRONMENT || '');

export const isKC = () => APP === 'KC';

export const isKA = () => APP === 'KA';

export const isIK = () => APP === 'IK';

export const isLOP = () => APP === 'LOP';

export const isPT = () => APP === 'PT';

export const isMEX = () => APP === 'MEX';

export const isMSVA = () => APP === 'MSVA';

export const isROB = () => APP === 'ROB';

export const isSE = () => APP === 'SE';

export const getApplicationEnvironment = () => (ENV === 'TEST' ? 'TEST' : null);
