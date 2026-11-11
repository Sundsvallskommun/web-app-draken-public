import { EXTERNAL_INSPECTION_TEMPLATE } from './external-inspection';
import { INTERNAL_INSPECTION_TEMPLATE } from './internal-inspection';
import type { InspectionProtocolTemplate } from './types';

export type {
  InspectionProtocolTemplate,
  ProtocolField,
  ProtocolObservations,
  ProtocolOption,
  ProtocolSection,
} from './types';

/** The protocols a handler can pick, in dropdown order. None is chosen until the handler picks one. */
export const INSPECTION_PROTOCOL_TEMPLATES: InspectionProtocolTemplate[] = [
  EXTERNAL_INSPECTION_TEMPLATE,
  INTERNAL_INSPECTION_TEMPLATE,
];

export const inspectionProtocolTemplate = (key: string | undefined): InspectionProtocolTemplate | undefined =>
  INSPECTION_PROTOCOL_TEMPLATES.find((template) => template.key === key);
