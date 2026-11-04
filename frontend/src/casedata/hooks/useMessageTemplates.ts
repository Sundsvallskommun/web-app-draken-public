import { User } from '@common/interfaces/user';
import {
  EMAIL_INFORMATION_TEXT,
  MessageTemplateInfo,
  MessageTemplates,
} from '@common/services/message-template-body-service';
import { getTemplateRole, getTemplateType } from '@common/utils/template-metadata';
import {
  fetchTemplatesWithMetadata,
  replaceTemplateParameters,
} from '@supportmanagement/services/message-template-service';
import { useEffect, useState } from 'react';

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

        const myPagesSignature = getContentWithFallback('mypages.signature', { user: userName });

        // App-specific templates of the type, falling back to the default ones when there are none
        const getSelectableTemplates = (type: string, excludedRoles: string[]) => {
          const isSelectable = (template: MessageTemplateInfo) =>
            getTemplateType(template) === type && !excludedRoles.includes(getTemplateRole(template) || '');
          const appTemplates = appResult.templates.filter(isSelectable);
          return appTemplates.length > 0 ? appTemplates : defaultResult.templates.filter(isSelectable);
        };

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
          myPagesSignature,
          emailTemplates: getSelectableTemplates('email', ['signature', 'publicdocuments', 'closing']),
          smsTemplates: getSelectableTemplates('sms', ['signature', 'closing']),
          myPagesTemplates: getSelectableTemplates('mypages', ['signature', 'closing']),
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
