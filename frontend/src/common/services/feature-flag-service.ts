import { isKC, isLOP } from './application-service';

export const isSuspendEnabled = () => isKC() || isLOP();
