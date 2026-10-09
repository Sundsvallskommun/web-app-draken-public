import { visibleMarkupText } from '@common/utils/visible-markup-text';
import type { RJSFSchema } from '@rjsf/utils';

import type { InvestigationFormData } from './investigation-document';

const TEMPLATE_FIELD = 'investigationTemplate';
const TEXT_FIELD = 'investigationText';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Prefix of the Templating API identifiers that hold the text an investigation template starts from. */
export const INVESTIGATION_TEXT_TEMPLATE_PREFIX = 'avvikelse.investigation.';

/**
 * The Templating API identifier of a template choice, by the repository's `{app}.{type}.{variant}`
 * convention. The variant is the schema's template value with dashes, since identifiers allow no
 * underscores: `sol_lss_hsl` → `avvikelse.investigation.sol-lss-hsl`. A choice without a stored
 * template simply has nothing to fill in.
 */
export const investigationTextTemplateIdentifier = (template: string): string =>
  `${INVESTIGATION_TEXT_TEMPLATE_PREFIX}${template.replaceAll('_', '-')}`;

/** Whether the schema has both a template choice and a rich-text investigation text it can fill. */
export const offersInvestigationTextTemplates = (schema: RJSFSchema | undefined): boolean => {
  const properties = schema?.properties;
  if (!isRecord(properties)) return false;
  const text = properties[TEXT_FIELD];
  return isRecord(properties[TEMPLATE_FIELD]) && isRecord(text) && text.contentMediaType === 'text/html';
};

/** The template chosen by a change of the form, or undefined when the choice did not change to one. */
export const changedInvestigationTemplate = (
  previous: InvestigationFormData | undefined,
  next: InvestigationFormData
): string | undefined => {
  const template = next[TEMPLATE_FIELD];
  return typeof template === 'string' && template !== previous?.[TEMPLATE_FIELD] ? template : undefined;
};

/**
 * Whether a template may replace the investigation text without asking: when the text is empty, or
 * still exactly what an earlier template put there.
 */
export const investigationTextIsReplaceable = (text: unknown, insertedTemplateText: string | undefined): boolean => {
  // Compared by words, so that the editor's own reformatting does not count as an edit.
  const current = visibleMarkupText(text);
  return current === '' || (insertedTemplateText !== undefined && current === visibleMarkupText(insertedTemplateText));
};

export const readInvestigationText = (formData: InvestigationFormData | undefined): unknown => formData?.[TEXT_FIELD];

export const withInvestigationText = (formData: InvestigationFormData, text: string): InvestigationFormData => ({
  ...formData,
  [TEXT_FIELD]: text,
});

export const readInvestigationTemplate = (formData: InvestigationFormData | undefined): unknown =>
  formData?.[TEMPLATE_FIELD];
