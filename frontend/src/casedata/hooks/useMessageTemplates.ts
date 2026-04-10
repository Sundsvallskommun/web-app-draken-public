import { User } from '@common/interfaces/user';
import { getTemplateRole, getTemplateType } from '@common/utils/template-metadata';
import {
  EMAIL_INFORMATION_TEXT,
  fetchTemplatesWithMetadata,
  replaceTemplateParameters,
  TemplateInfo,
} from '@supportmanagement/services/message-template-service';
import { useEffect, useState } from 'react';

export interface MessageTemplates {
  internalSignature: string;
  smsTemplate: string;
  smsSignature: string;
  emailSignature: string;
  emailTemplates: TemplateInfo[];
  smsTemplates: TemplateInfo[];
  byId: Record<string, string>;
  app: string;
}

interface UseMessageTemplatesResult {
  templates: MessageTemplates | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMessageTemplates(user: User, shouldLoad: boolean): UseMessageTemplatesResult {
  const [templates, setTemplates] = useState<MessageTemplates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldLoad || templates) return;

    const loadTemplates = async () => {
      setLoading(true);
      setError(null);

      try {
        const app = process.env.NEXT_PUBLIC_APPLICATION?.toLowerCase() || 'mex';
        const userName = `${user.firstName} ${user.lastName}`;

        const [appResult, defaultResult, internalResult] = await Promise.all([
          fetchTemplatesWithMetadata({ prefix: `${app}.` }),
          fetchTemplatesWithMetadata({ prefix: 'default.' }),
          fetchTemplatesWithMetadata({ prefix: 'internal.' }),
        ]);

        const getContent = (id: string, params: Record<string, string> = {}) => {
          const template = appResult.byId[id] || defaultResult.byId[id] || internalResult.byId[id];
          if (!template) return '';
          return replaceTemplateParameters(template.content, params);
        };

        // Helper: get app-specific content, falling back to default.* prefix
        const getContentWithFallback = (type: string, params: Record<string, string> = {}) => {
          const appContent = getContent(`${app}.${type}`, params);
          if (appContent) return appContent;
          return getContent(`default.${type}`, params);
        };

        const internalSignature = getContent('internal.signature', { user: userName });

        const smsSignature = getContentWithFallback('sms.signature', { user: userName });
        const smsContent = getContentWithFallback('sms.default', { user: userName });
        const smsTemplate = smsContent + smsSignature;

        const emailSignature = getContentWithFallback('email.signature', {
          user: userName,
          email_information: EMAIL_INFORMATION_TEXT,
        });

        const emailTemplates = appResult.templates.filter((t) => {
          return getTemplateType(t) === 'Email' && !['signature', 'publicdocuments'].includes(getTemplateRole(t) || '');
        });

        // If no app-specific email templates, use default ones
        const fallbackEmailTemplates =
          emailTemplates.length === 0
            ? defaultResult.templates.filter((t) => {
                return (
                  getTemplateType(t) === 'Email' &&
                  !['signature', 'publicdocuments', 'closing'].includes(getTemplateRole(t) || '')
                );
              })
            : [];

        const smsTemplates = appResult.templates.filter((t) => {
          return getTemplateType(t) === 'Sms' && getTemplateRole(t) !== 'signature';
        });

        // If no app-specific sms templates, use default ones
        const fallbackSmsTemplates =
          smsTemplates.length === 0
            ? defaultResult.templates.filter((t) => {
                return getTemplateType(t) === 'Sms' && getTemplateRole(t) !== 'signature';
              })
            : [];

        const byId: Record<string, string> = {};
        for (const t of defaultResult.templates) {
          byId[t.identifier] = t.content;
        }
        for (const t of appResult.templates) {
          byId[t.identifier] = t.content;
        }
        for (const t of internalResult.templates) {
          byId[t.identifier] = t.content;
        }

        setTemplates({
          internalSignature,
          smsTemplate,
          smsSignature,
          emailSignature,
          emailTemplates: [...emailTemplates, ...fallbackEmailTemplates],
          smsTemplates: [...smsTemplates, ...fallbackSmsTemplates],
          byId,
          app,
        });
      } catch (err) {
        console.error('Failed to load templates', err);
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [shouldLoad, templates, user.firstName, user.lastName]);

  const reload = () => {
    setTemplates(null);
  };

  return { templates, loading, error, reload };
}
