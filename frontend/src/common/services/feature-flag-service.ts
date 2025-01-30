import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isIK, isKC, isLOP } from './application-service';

export const isSuspendEnabled = () => isKC() || isLOP();
export const isNotificicationEnabled = () => isKC() || isLOP() || isIK() || getApplicationEnvironment() === 'TEST';
export const attestationEnabled = (user: User) =>
  isLOP() && user.permissions?.canViewAttestations && getApplicationEnvironment() === 'TEST';
