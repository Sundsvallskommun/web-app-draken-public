// Only lab-local types belong here. The lab uses the module's canonical vocabulary
// (InvestigationDocumentKey, InvestigationFormData) imported straight from
// ../investigation-document, so one concept keeps one name across lab and production.

export const investigationLabRoles = ['unitManager', 'lexInvestigator', 'masMar', 'reader'] as const;

export type InvestigationLabRole = (typeof investigationLabRoles)[number];

export interface InvestigationSchemaAccess {
  canRead: boolean;
  canWrite: boolean;
}

export interface InvestigationLabRoleOption {
  value: InvestigationLabRole;
  label: string;
  description: string;
}

export interface InvestigationLabNotice {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
