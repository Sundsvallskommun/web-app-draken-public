interface TemplateWithMetadata {
  identifier?: string;
  metadata?: Array<{ key: string; value: string }>;
}

export function getTemplateMetadata(template: TemplateWithMetadata, key: string): string | undefined {
  return template.metadata?.find((m) => m.key === key)?.value;
}

/**
 * Get template type from metadata (templateType), falling back to identifier parts[1].
 * E.g. "mex.email.default" → "email"
 */
export function getTemplateType(template: TemplateWithMetadata): string | undefined {
  const fromMetadata = getTemplateMetadata(template, 'templateType');
  if (fromMetadata) return fromMetadata;

  const parts = template.identifier?.split('.') || [];
  return parts.length >= 2 ? parts[1] : undefined;
}

/**
 * Get template role from metadata (templateRole), falling back to identifier parts[2].
 * E.g. "mex.email.signature" → "signature"
 */
export function getTemplateRole(template: TemplateWithMetadata): string | undefined {
  const fromMetadata = getTemplateMetadata(template, 'templateRole');
  if (fromMetadata) return fromMetadata;

  const parts = template.identifier?.split('.') || [];
  return parts.length >= 3 ? parts[2] : undefined;
}
