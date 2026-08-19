export const localInvestigationDocumentKeys = ['utredning-enhetschef', 'utredning-sol-lss', 'utredning-hsl'] as const;

export type LocalInvestigationDocumentKey = (typeof localInvestigationDocumentKeys)[number];

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
