import type { RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import Ajv2020 from 'ajv/dist/2020';

import type { SupportAttachment } from './support-attachment-service';

/**
 * The attachments an errand type asks for, declared by its schema under `x-attachments`. The
 * jsonschema service takes no file uploads, so these are not properties of the document: the files
 * go to SupportManagement and carry the key as their purpose. An entry without `requiredWhen` is
 * offered but never demanded.
 */
export interface AttachmentRequirement {
  key: string;
  label: string;
  description?: string;
  requiredWhen?: RJSFSchema;
}

const ATTACHMENTS_KEYWORD = 'x-attachments';

// Schemas declare $schema: draft 2020-12, which the default AJV8 validator (draft-07) cannot compile.
const validator = customizeValidator({ AjvClass: Ajv2020 });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAttachmentRequirement = (value: unknown): value is AttachmentRequirement =>
  isRecord(value) && typeof value.key === 'string' && typeof value.label === 'string';

/**
 * An entry without a key or a label is skipped rather than failing the whole list. The schema is
 * maintained in another service and reaches us with no build step in between, so one malformed
 * entry must not take the other requirements down with it.
 */
export const attachmentRequirementsOfSchema = (schema: RJSFSchema | null | undefined): AttachmentRequirement[] => {
  const declared: unknown = schema?.[ATTACHMENTS_KEYWORD];
  return Array.isArray(declared) ? declared.filter(isAttachmentRequirement) : [];
};

/**
 * Whether the answers trigger the requirement, judged by the same AJV instance the form validates
 * with, so a condition cannot mean one thing here and another in the form.
 */
const isRequiredByTheAnswers = (
  requirement: AttachmentRequirement,
  answers: Record<string, unknown>,
  schema: RJSFSchema | null | undefined
): boolean => {
  if (!requirement.requiredWhen) return false;

  try {
    return validator.isValid(requirement.requiredWhen, answers, schema ?? {});
  } catch {
    return false;
  }
};

export const requiredAttachments = (
  schema: RJSFSchema | null | undefined,
  answers: Record<string, unknown> | undefined
): AttachmentRequirement[] =>
  attachmentRequirementsOfSchema(schema).filter((requirement) =>
    isRequiredByTheAnswers(requirement, answers ?? {}, schema)
  );

const purposesOf = (attachments: readonly SupportAttachment[] | undefined): Set<string> =>
  new Set((attachments ?? []).map((attachment) => attachment.purpose?.name).filter((name): name is string => !!name));

export const missingAttachments = (
  schema: RJSFSchema | null | undefined,
  answers: Record<string, unknown> | undefined,
  attachments: readonly SupportAttachment[] | undefined
): AttachmentRequirement[] => {
  const delivered = purposesOf(attachments);
  return requiredAttachments(schema, answers).filter((requirement) => !delivered.has(requirement.key));
};
