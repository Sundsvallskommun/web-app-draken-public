import type { InspectionProtocolTemplate } from '../types';
import { INTERNAL_INSPECTION_HTML } from './template';

/** Tillsynsprotokoll inre tillsyn: a desk inspection of the permit holder, the checks made as the control points. */
export const INTERNAL_INSPECTION_TEMPLATE: InspectionProtocolTemplate = {
  key: 'internal_inspection',
  label: 'Inre tillsyn',
  identifier: 'internal-inspection-protocol',
  html: INTERNAL_INSPECTION_HTML,
  controlPoints: [
    'Granskning via upplysningstjänsten Syna/Svensk faktakontroll',
    'Belastningsregistret',
    'Skatteverket',
    'Kronofogden',
    'Annat',
  ],
  sections: [
    {
      key: 'business',
      title: 'Verksamhet',
      position: 'before',
      columns: 2,
      fields: [
        { kind: 'text', key: 'businessName', label: 'Verksamhetens namn', prefill: 'permitHolderName' },
        { kind: 'text', key: 'businessOrgNumber', label: 'Organisationsnummer', prefill: 'permitHolderOrgNumber' },
        { kind: 'text', key: 'businessAddress', label: 'Adress' },
        { kind: 'text', key: 'businessType', label: 'Typ av verksamhet' },
      ],
    },
    {
      key: 'inspection',
      title: 'Utförd tillsyn',
      position: 'before',
      columns: 2,
      fields: [
        { kind: 'text', key: 'inspectionType', label: 'Typ av tillsyn' },
        { kind: 'date', key: 'inspectionDate', label: 'Datum', prefill: 'today', narrow: true },
        { kind: 'text', key: 'inspectionScope', label: 'Tillsynen omfattar' },
        { kind: 'text', key: 'inspectorName', label: 'Utförd av', prefill: 'inspector' },
        { kind: 'text', key: 'inspectorRole', label: 'Roll' },
      ],
    },
    {
      key: 'summary',
      title: 'Summering av tillsyn',
      position: 'after',
      fields: [
        {
          kind: 'choice',
          key: 'summary',
          label: 'Summering',
          options: [
            { value: 'approved', label: 'Godkänd', parameter: 'summaryApproved' },
            {
              value: 'actionRequired',
              label: 'Godkänd, men åtgärd krävs',
              parameter: 'summaryApprovedActionRequired',
              then: [
                { kind: 'textarea', key: 'summaryActionRequiredText', label: 'Åtgärd' },
                { kind: 'date', key: 'followUpDate', label: 'Uppföljning av åtgärd senast', narrow: true },
              ],
            },
            {
              value: 'investigation',
              label: 'Tillsynsutredning inleds',
              parameter: 'summaryInvestigationOpened',
              then: [
                { kind: 'date', key: 'investigationDate', label: 'Datum', narrow: true },
                { kind: 'textarea', key: 'summaryInvestigationText', label: 'Beskrivning' },
              ],
            },
          ],
        },
      ],
    },
  ],
};
