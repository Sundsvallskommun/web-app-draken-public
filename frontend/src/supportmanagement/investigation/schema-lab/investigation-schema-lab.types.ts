import type { InvestigationDocumentKey } from '../investigation-document';

export type { InvestigationFormData } from '../investigation-document';
export { investigationDocumentKeys as investigationSchemaKeys } from '../investigation-document';
export type InvestigationSchemaKey = InvestigationDocumentKey;

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
