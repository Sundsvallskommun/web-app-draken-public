import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isKC, isLOP, isMEX, isPT } from './application-service';
import { appConfig } from '@config/appconfig';

export const isSuspendEnabled = () => isKC() || isLOP();
export const isAppealEnabled = () => isPT() && getApplicationEnvironment() === 'TEST';
export const isNotificicationEnabled = () => true;
export const attestationEnabled = (user: User) => isLOP() && user.permissions?.canViewAttestations;
