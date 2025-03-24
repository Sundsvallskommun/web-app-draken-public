import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isIK, isKC, isLOP, isPT } from './application-service';

export const isSuspendEnabled = () => isKC() || isLOP();
export const isAppealEnabled = () => isPT() && getApplicationEnvironment() === 'TEST';
export const isNotificicationEnabled = () => true;
export const attestationEnabled = (user: User) =>
  isLOP() && user.permissions?.canViewAttestations && getApplicationEnvironment() === 'TEST';
