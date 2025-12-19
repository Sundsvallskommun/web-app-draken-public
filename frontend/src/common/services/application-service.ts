export const isKC = () => process.env.NEXT_PUBLIC_APPLICATION === 'KC';

export const isKA = () => process.env.NEXT_PUBLIC_APPLICATION === 'KA';

export const isIK = () => process.env.NEXT_PUBLIC_APPLICATION === 'IK';

export const isLOP = () => process.env.NEXT_PUBLIC_APPLICATION === 'LOP';

export const isPT = () => process.env.NEXT_PUBLIC_APPLICATION === 'PT';

export const isMEX = () => process.env.NEXT_PUBLIC_APPLICATION === 'MEX';

export const isMSVA = () => process.env.NEXT_PUBLIC_APPLICATION === 'MSVA';

export const isROB = () => process.env.NEXT_PUBLIC_APPLICATION === 'ROB';

export const isSE = () => process.env.NEXT_PUBLIC_APPLICATION === 'SE';

export const getApplicationEnvironment = () => (process.env.NEXT_PUBLIC_ENVIRONMENT === 'TEST' ? 'TEST' : null);
