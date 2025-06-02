import { User } from '@common/interfaces/user';
import { TFunction } from 'i18next';
import { isKA } from '@common/services/application-service';

export function getDefaultEmailBody(user: User, t: TFunction): string {
  if (isKA()) {
    return t('messages:templates.email.KA.normal', {
      user: `${user.firstName} ${user.lastName}`,
      defaultValue: t('messages:templates.email.default'),
    });
  }

  const app = process.env.NEXT_PUBLIC_APPLICATION;
  return t(`messages:templates.email.${app}`, {
    user: `${user.firstName} ${user.lastName}`,
    defaultValue: t('messages:templates.email.default'),
  });
}

export function getDefaultSmsBody(user: User, t: TFunction): string {
  if (isKA()) {
    return t('messages:templates.sms.KA.normal', {
      user: user.firstName,
      defaultValue: t('messages:templates.sms.default'),
    });
  }

  const app = process.env.NEXT_PUBLIC_APPLICATION;
  return t(`messages:templates.sms.${app}`, {
    user: user.firstName,
    defaultValue: t('messages:templates.sms.default'),
  });
}
