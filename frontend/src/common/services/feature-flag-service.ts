import { isKC, isLOP } from './application-service';

export const isNotificationsEnabled = () => isKC() || isLOP();
export const isSuspendEnabled = () => isKC() || isLOP();
