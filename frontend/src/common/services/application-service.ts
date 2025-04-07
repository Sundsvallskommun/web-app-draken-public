import { appConfig } from '@config/appconfig';

export const isKC = () => process.env.NEXT_PUBLIC_APPLICATION === 'KC';

export const isKA = () => process.env.NEXT_PUBLIC_APPLICATION === 'KA';

export const isIK = () => process.env.NEXT_PUBLIC_APPLICATION === 'IK';

export const isLOP = () => process.env.NEXT_PUBLIC_APPLICATION === 'LOP';

export const isPT = () => process.env.NEXT_PUBLIC_APPLICATION === 'PT';

export const isMEX = () => process.env.NEXT_PUBLIC_APPLICATION === 'MEX';

export const getApplicationEnvironment = () =>
  (isPT() || isKC() || isKA() || isIK() || isLOP() || isMEX()) && process.env.NEXT_PUBLIC_ENVIRONMENT === 'TEST'
    ? 'TEST'
    : null;
