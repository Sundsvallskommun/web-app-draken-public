export const isIK = () => process.env.APPLICATION === 'IK';

export const isLOP = () => process.env.APPLICATION === 'LOP';

export const isKC = () => process.env.APPLICATION === 'KC';

export const isKA = () => process.env.APPLICATION === 'KA';

export const isPT = () => process.env.APPLICATION === 'PT';

export const isPTAnge = () => isPT() && process.env.MUNICIPALITY_ID === '2260';

export const isMEX = () => process.env.APPLICATION === 'MEX';
