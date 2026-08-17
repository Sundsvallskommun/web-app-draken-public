import { InvestigationDocumentKey } from '../investigation-document';
import {
  InvestigationLabRole,
  InvestigationLabRoleOption,
  InvestigationSchemaAccess,
} from './investigation-schema-lab.types';

export const investigationLabRoleOptions: readonly InvestigationLabRoleOption[] = [
  {
    value: 'unitManager',
    label: 'Enhetschef',
    description: 'Kan redigera enhetschefens utredning.',
  },
  {
    value: 'lexInvestigator',
    label: 'LEX-utredare',
    description: 'Kan redigera utredningen enligt SoL/LSS.',
  },
  {
    value: 'masMar',
    label: 'MAS/MAR',
    description: 'Kan redigera utredningen enligt HSL.',
  },
  {
    value: 'reader',
    label: 'Läsare',
    description: 'Kan läsa samtliga utredningar men inte redigera.',
  },
];

const schemaOwnerByKey: Record<InvestigationDocumentKey, Exclude<InvestigationLabRole, 'reader'>> = {
  'utredning-enhetschef': 'unitManager',
  'utredning-sol-lss': 'lexInvestigator',
  'utredning-hsl': 'masMar',
};

/**
 * The lab uses this narrow adapter instead of coupling forms to role names.
 * A future SupportManagement authorization response can replace this mapping
 * while the form continues to consume only canRead/canWrite.
 */
export function getInvestigationSchemaAccess(
  role: InvestigationLabRole,
  schemaKey: InvestigationDocumentKey
): InvestigationSchemaAccess {
  return {
    canRead: true,
    canWrite: schemaOwnerByKey[schemaKey] === role,
  };
}
