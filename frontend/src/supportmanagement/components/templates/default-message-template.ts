import { User } from '@common/interfaces/user';
import { isKA } from '@common/services/application-service';
import { TFunction } from 'i18next';


export function getDefaultEmailBody(user: User, t: TFunction): string {
  if (isKA()) {
    return t('messages:templates.email.KA.normal', {
      user: `${user.firstName} ${user.lastName}`,
      defaultValue: t('messages:templates.email.default'),
    });
  }

  const app = import.meta.env.VITE_APPLICATION;
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

  const app = import.meta.env.VITE_APPLICATION;
  return t(`messages:templates.sms.${app}`, {
    user: user.firstName,
    defaultValue: t('messages:templates.sms.default'),
  });
}

export function removeEmailInformation(contactMeans: string, template: string): string {
  let temporaryTemplate = template;
  if (contactMeans !== 'email' && template.includes('Vänligen ändra inte ämnesraden')) {
    temporaryTemplate = temporaryTemplate.replace(
      /Vänligen ändra inte ämnesraden om du svarar på detta meddelande<br><br>?/gi,
      ''
    );
    temporaryTemplate = temporaryTemplate.replace(/Vänligen ändra inte ämnesraden om du besvarar mejlet.<br>?/gi, '');
  }
  return temporaryTemplate;
}
