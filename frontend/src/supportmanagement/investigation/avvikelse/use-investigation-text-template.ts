'use client';

import { useConfirm } from '@sk-web-gui/react';
import { fetchTemplatesWithMetadata, type TemplateResult } from '@supportmanagement/services/message-template-service';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { InvestigationFormData } from './investigation-document';
import {
  INVESTIGATION_TEXT_TEMPLATE_PREFIX,
  investigationTextIsReplaceable,
  investigationTextTemplateIdentifier,
  readInvestigationTemplate,
  readInvestigationText,
} from './investigation-text-template';

export interface InvestigationTextTemplate {
  /** Fills the text when the investigator chooses a template, asking before written text is replaced. */
  offer: (template: string) => Promise<void>;
  /**
   * The text a new document starts with when its template was chosen for it: the lagrum leaves only
   * one, so the investigator never makes the choice that would fill it. It is part of the document's
   * start, not an edit, and a later choice replaces it without asking, as text a template put there.
   */
  startingText: (template: string) => Promise<string | undefined>;
}

/**
 * Fills the investigation text from the Templating API when the investigator chooses a template.
 * Text that someone has written is only replaced after asking; text an earlier template put there is
 * replaced straight away, so trying templates before writing anything needs no confirmation. The
 * templates are read once per document, on the first need.
 */
export function useInvestigationTextTemplate(
  formData: InvestigationFormData | undefined,
  applyTemplateText: (template: string, text: string) => void
): InvestigationTextTemplate {
  const confirm = useConfirm();
  const latestFormData = useRef(formData);
  const insertedTemplateText = useRef<string | undefined>(undefined);
  const templates = useRef<Promise<TemplateResult> | undefined>(undefined);

  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  const readTemplateText = useCallback(async (template: string): Promise<string | undefined> => {
    templates.current ??= fetchTemplatesWithMetadata(INVESTIGATION_TEXT_TEMPLATE_PREFIX);
    return (await templates.current).byId[investigationTextTemplateIdentifier(template)]?.content;
  }, []);

  const startingText = useCallback(
    async (template: string) => {
      const text = await readTemplateText(template);
      if (text) insertedTemplateText.current = text;
      return text;
    },
    [readTemplateText]
  );

  const offer = useCallback(
    async (template: string) => {
      const text = await readTemplateText(template);
      // The choice may have moved on while the templates were on their way.
      const stillChosen = () => readInvestigationTemplate(latestFormData.current) === template;
      if (!text || !stillChosen()) return;

      const currentText = readInvestigationText(latestFormData.current);
      if (!investigationTextIsReplaceable(currentText, insertedTemplateText.current)) {
        const replace = await confirm.showConfirmation(
          'Använda mallens text?',
          'Utredningstexten ersätts med texten i den valda mallen. Det som står där nu försvinner.',
          'Ja, ersätt',
          'Nej, behåll texten',
          'info',
          'question'
        );
        if (!replace || !stillChosen()) return;
      }
      insertedTemplateText.current = text;
      applyTemplateText(template, text);
    },
    [applyTemplateText, confirm, readTemplateText]
  );

  return useMemo(() => ({ offer, startingText }), [offer, startingText]);
}
