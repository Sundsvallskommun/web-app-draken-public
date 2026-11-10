export enum ExternalIdType {
  PRIVATE = 'PRIVATE',
  ENTERPRISE = 'ENTERPRISE',
  EMPLOYEE = 'EMPLOYEE',
  COMPANY = 'COMPANY',
}

export const isOrganizationExternalIdType = (type?: string): boolean => type === ExternalIdType.COMPANY || type === ExternalIdType.ENTERPRISE;
