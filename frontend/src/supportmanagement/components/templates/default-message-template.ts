import { User } from '@common/interfaces/user';
import { getEmailTemplate, getSmsTemplate } from '@supportmanagement/services/message-template-service';

const APP = process.env.NEXT_PUBLIC_APPLICATION;

export async function getDefaultEmailBody(user: User, variant: string = 'default'): Promise<string> {
  const content = await getEmailTemplate(APP, variant, {
    user: `${user.firstName} ${user.lastName}`,
  });

  if (!content) {
    console.error(`Failed to fetch email template: ${APP}.email.${variant}`);
    return '';
  }

  return content;
}

export async function getDefaultSmsBody(user: User, variant: string = 'default'): Promise<string> {
  const content = await getSmsTemplate(APP, variant, {
    user: user.firstName,
  });

  if (!content) {
    console.error(`Failed to fetch sms template: ${APP}.sms.${variant}`);
    return '';
  }

  return content;
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
