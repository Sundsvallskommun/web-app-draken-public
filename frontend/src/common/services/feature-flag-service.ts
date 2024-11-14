import { isKC, isLOP } from './application-service';

export const isNotificationsEnabled = () => true;
export const isSuspendEnabled = () => isKC() || isLOP();
