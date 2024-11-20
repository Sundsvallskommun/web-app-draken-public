import { getApplicationEnvironment, isKC, isLOP } from './application-service';

export const isSuspendEnabled = () => isKC() || isLOP();
export const isNotificicationEnabled = () => isKC() || isLOP() || getApplicationEnvironment() === 'TEST';
