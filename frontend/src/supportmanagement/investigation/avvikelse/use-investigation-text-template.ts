'use client';

import { useConfirm } from '@sk-web-gui/react';
import { fetchTemplatesWithMetadata, type TemplateResult } from '@supportmanagement/services/message-template-service';
import { useCallback, useEffect, useRef } from 'react';

import type { InvestigationFormData } from './investigation-document';
import {
  INVESTIGATION_TEXT_TEMPLATE_PREFIX,
  investigationTextIsReplaceable,
  investigationTextTemplateIdentifier,
  readInvestigationTemplate,
  readInvestigationText,
} from './investigation-text-template';

/**
 * Fills the investigation text from the Templating API when the investigator chooses a template.
 * Text that someone has written is only replaced after asking; text an earlier template put there is
 * replaced straight away, so trying templates before writing anything needs no confirmation. The
 * templates are read once per document, on the first choice.
 */
export function useInvestigationTextTemplate(
  formData: InvestigationFormData | undefined,
  applyTemplateText: (template: string, text: string) => void
): (template: string) => Promise<void> {
  const confirm = useConfirm();
  const latestFormData = useRef(formData);
  const insertedTemplateText = useRef<string | undefined>(undefined);
  const templates = useRef<Promise<TemplateResult> | undefined>(undefined);

  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  return useCallback(
    async (template: string) => {
      templates.current ??= fetchTemplatesWithMetadata(INVESTIGATION_TEXT_TEMPLATE_PREFIX);
      const text = (await templates.current).byId[investigationTextTemplateIdentifier(template)]?.content;
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
    [applyTemplateText, confirm]
  );
}
