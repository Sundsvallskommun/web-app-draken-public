import { User } from '@common/interfaces/user';
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

        const [appResult, internalResult] = await Promise.all([
          fetchTemplatesWithMetadata({ prefix: `${app}.` }),
          fetchTemplatesWithMetadata({ prefix: 'internal.' }),
        ]);

        const getContent = (id: string, params: Record<string, string> = {}) => {
          const template = appResult.byId[id] || internalResult.byId[id];
          if (!template) return '';
          return replaceTemplateParameters(template.content, params);
        };

        const internalSignature = getContent('internal.signature', { user: userName });

        const smsSignature = getContent(`${app}.sms.signature`, { user: userName });
        const smsContent = getContent(`${app}.sms.default`, { user: userName });
        const smsTemplate = smsContent + smsSignature;

        const emailSignature = getContent(`${app}.email.signature`, {
          user: userName,
          email_information: EMAIL_INFORMATION_TEXT,
        });

        const emailTemplates = appResult.templates.filter((t) => {
          const parts = t.identifier.split('.');
          return parts.length >= 3 && parts[1] === 'email' && !['signature', 'publicdocuments'].includes(parts[2]);
        });

        const smsTemplates = appResult.templates.filter((t) => {
          const parts = t.identifier.split('.');
          return parts.length >= 3 && parts[1] === 'sms' && !['signature'].includes(parts[2]);
        });

        const byId: Record<string, string> = {};
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
          emailTemplates,
          smsTemplates,
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
  }, [shouldLoad, templates, user]);

  const reload = () => {
    setTemplates(null);
  };

  return { templates, loading, error, reload };
}
