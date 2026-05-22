export type MessageContactMeans =
  | 'email'
  | 'sms'
  | 'webmessage'
  | 'digitalmail'
  | 'paper'
  | 'draken'
  | 'minasidor'
  | 'katla';

export const EMAIL_INFORMATION_TEXT =
  '<p><b>Vänligen ändra inte ämnesraden om du svarar på detta meddelande.</b></p><br>';

export interface MessageTemplateInfo {
  identifier: string;
  name: string;
  content: string;
}

export interface MessageTemplates {
  internalSignature: string;
  smsTemplate: string;
  smsSignature: string;
  emailSignature: string;
  emailTemplates: MessageTemplateInfo[];
  smsTemplates: MessageTemplateInfo[];
  byId: Record<string, string>;
  app: string;
}

export const supportsSelectableTemplates = (means: MessageContactMeans): means is 'email' | 'sms' =>
  means === 'email' || means === 'sms';

export const removeEmailInformation = (means: MessageContactMeans, template: string): string => {
  if (means === 'email') return template;

  return template
    .replace(EMAIL_INFORMATION_TEXT, '')
    .replace(/Vänligen ändra inte ämnesraden om du svarar på detta meddelande<br><br>?/gi, '')
    .replace(/Vänligen ändra inte ämnesraden om du besvarar mejlet.<br>?/gi, '');
};

export const getTemplateOptions = (
  templates: MessageTemplates | null,
  means: MessageContactMeans
): MessageTemplateInfo[] => {
  if (!templates || !supportsSelectableTemplates(means)) return [];
  return means === 'sms' ? templates.smsTemplates : templates.emailTemplates;
};

export const getDefaultTemplateId = (templates: MessageTemplates | null, means: MessageContactMeans): string => {
  return (
    getTemplateOptions(templates, means).find((template) => template.identifier?.endsWith('.default'))?.identifier || ''
  );
};

export const getDefaultMessageBody = (
  templates: MessageTemplates | null,
  means: MessageContactMeans,
  history = ''
): string => {
  if (!templates) return history;

  switch (means) {
    case 'draken':
      return templates.internalSignature + history;
    case 'sms':
      return templates.smsTemplate + history;
    default:
      return removeEmailInformation(means, templates.emailSignature) + history;
  }
};

export const buildMessageTemplateBody = ({
  templates,
  templateId,
  means,
  history = '',
  includePublicDocumentsFooter = false,
}: {
  templates: MessageTemplates | null;
  templateId: string;
  means: MessageContactMeans;
  history?: string;
  includePublicDocumentsFooter?: boolean;
}): string => {
  if (!templates) return history;
  if (!templateId) return getDefaultMessageBody(templates, means, history);

  const content = templates.byId[templateId] || '';
  if (means === 'sms') {
    return content + templates.smsSignature + history;
  }

  const footerId = `${templates.app}.email.publicdocuments`;
  const shouldAddFooter =
    includePublicDocumentsFooter && (templateId.endsWith('.priority') || templateId.endsWith('.default'));
  const footer = shouldAddFooter ? templates.byId[footerId] || '' : '';

  return content + templates.emailSignature + footer + history;
};
