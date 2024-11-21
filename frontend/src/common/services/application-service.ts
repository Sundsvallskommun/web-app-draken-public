export const isKC = () => process.env.NEXT_PUBLIC_APPLICATION === 'KC';

export const isIK = () => process.env.NEXT_PUBLIC_APPLICATION === 'IK';

export const isLOP = () => process.env.NEXT_PUBLIC_APPLICATION === 'LOP';

export const isPT = () => process.env.NEXT_PUBLIC_APPLICATION === 'PT';

export const isMEX = () => process.env.NEXT_PUBLIC_APPLICATION === 'MEX';

export const getApplicationName = () =>
  isPT()
    ? 'Parkeringstillstånd'
    : isKC()
    ? 'Kontakt Sundsvall'
    : isIK()
    ? 'Intern kundtjanst'
    : isLOP()
    ? 'Lön och Pension'
    : isMEX()
    ? 'Mark och exploatering'
    : 'appen';

export const getApplicationEnvironment = () =>
  (isPT() || isKC() || isIK() || isLOP() || isMEX()) && process.env.NEXT_PUBLIC_ENVIRONMENT === 'TEST' ? 'TEST' : null;
