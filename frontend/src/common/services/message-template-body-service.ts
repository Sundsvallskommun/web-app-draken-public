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
  metadata?: Array<{ key: string; value: string }>;
}

const getExplicitTemplateRole = (template: MessageTemplateInfo): string | undefined =>
  template.metadata?.find((metadata) => metadata.key === 'templateRole')?.value?.toLowerCase();

const getTemplateRoleFromIdentifier = (template: MessageTemplateInfo): string | undefined => {
  const parts = template.identifier?.split('.') || [];
  return parts.length >= 3 ? parts[2].toLowerCase() : undefined;
};

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
  const options = getTemplateOptions(templates, means);
  const explicitDefault = options.find((template) => getExplicitTemplateRole(template) === 'default');
  if (explicitDefault) return explicitDefault.identifier;

  const legacyDefault = options.find(
    (template) => !getExplicitTemplateRole(template) && getTemplateRoleFromIdentifier(template) === 'default'
  );
  if (legacyDefault) return legacyDefault.identifier;

  // Last-resort fallback: pick the first available template so the body matches what the
  // dropdown visually shows as selected when no template follows the .default convention.
  return options[0]?.identifier || '';
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
// The shell supplies the template namespace once per application module graph.
// Template consumers need a namespace, not access to the deployment identity.
let messageTemplateNamespace: string | undefined;

export const configureMessageTemplateNamespace = (namespace: string): void => {
  if (!/^[a-z][a-z0-9-]*$/u.test(namespace)) throw new Error('Invalid message template namespace');
  messageTemplateNamespace = namespace;
};

export const getMessageTemplateNamespace = (): string => {
  if (!messageTemplateNamespace) throw new Error('Message template namespace has not been configured by the shell');
  return messageTemplateNamespace;
};
