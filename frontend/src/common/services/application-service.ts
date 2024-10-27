export const isKC = () => process.env.NEXT_PUBLIC_APPLICATION === 'KC';

export const isIS = () => process.env.NEXT_PUBLIC_APPLICATION === 'IS';

export const isLOP = () => process.env.NEXT_PUBLIC_APPLICATION === 'LOP';

export const isPT = () => process.env.NEXT_PUBLIC_APPLICATION === 'PT';

export const isMEX = () => process.env.NEXT_PUBLIC_APPLICATION === 'MEX';

export const getApplicationName = () =>
  isPT()
    ? 'Parkeringstillstånd'
    : isKC()
    ? 'Kontakt Sundsvall'
    : isIS()
    ? 'Intern service'
    : isLOP()
    ? 'Lön och Pension'
    : isMEX()
    ? 'Mark och exploatering'
    : 'appen';

export const getApplicationEnvironment = () =>
  (isPT() || isKC() || isIS() || isLOP() || isMEX()) && process.env.NEXT_PUBLIC_ENVIRONMENT === 'TEST' ? 'TEST' : null;
