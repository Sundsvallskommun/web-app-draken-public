import type { InspectionProtocolTemplate, ProtocolOption } from '../types';
import { SERVING_PERMIT_HTML } from './template';

const yes = (parameter: string, followUp?: ProtocolOption['followUp']): ProtocolOption => ({
  value: 'yes',
  label: 'Ja',
  parameter,
  followUp,
});
const no = (parameter: string): ProtocolOption => ({ value: 'no', label: 'Nej', parameter });

/** Tillsynsprotokoll Alkohollagen: the paper protocol's blocks, with the control points as the loop. */
export const SERVING_PERMIT_TEMPLATE: InspectionProtocolTemplate = {
  key: 'serving_permit',
  label: 'Serveringstillstånd – tillsyn',
  identifier: 'serving-inspection-protocol',
  html: SERVING_PERMIT_HTML,
  controlPoints: [
    'Nykterhet (3:5, 3:8, 8:20)',
    'Ålderskontroll (3:7, 3:8)',
    'Servering minderåriga',
    'Marknadsföring (7:1)',
    'Alkoholfria alternativ (8:22)',
    'Personalliggare',
    'Brandskydd (8:16)',
    'För många gäster',
  ],
  sections: [
    {
      key: 'premises',
      title: 'Serveringsställe och tillståndshavare',
      position: 'before',
      columns: 2,
      fields: [
        { kind: 'text', key: 'premisesName', label: 'Restaurang' },
        { kind: 'text', key: 'premisesAddress', label: 'Adress' },
        { kind: 'text', key: 'permitHolderName', label: 'Tillståndshavare', prefill: 'permitHolderName' },
        { kind: 'text', key: 'permitHolderOrgNumber', label: 'Organisationsnummer', prefill: 'permitHolderOrgNumber' },
      ],
    },
    {
      key: 'visit',
      title: 'Uppgifter om tillsynsbesöket',
      position: 'before',
      columns: 4,
      fields: [
        { kind: 'date', key: 'inspectionDate', label: 'Tillsynsdatum', prefill: 'today' },
        { kind: 'time', key: 'visitStartTime', label: 'Inleds kl.' },
        { kind: 'time', key: 'visitEndTime', label: 'Avslutades kl.' },
        { kind: 'text', key: 'guestCount', label: 'Antal gäster' },
        {
          kind: 'choice',
          key: 'visit',
          label: 'Besök i lokalen',
          options: [
            { value: 'premises', label: 'Ja', parameter: 'visitInPremises' },
            { value: 'closed', label: 'Stängt', parameter: 'visitClosed' },
          ],
        },
        {
          kind: 'multi',
          key: 'coordinatedWith',
          label: 'Samordnad tillsyn tillsammans med',
          options: [
            { value: 'none', label: 'Nej', parameter: 'coordinatedNone' },
            { value: 'police', label: 'Polis', parameter: 'coordinatedPolice' },
            { value: 'taxAgency', label: 'Skatteverket', parameter: 'coordinatedTaxAgency' },
            { value: 'rescueService', label: 'Räddningstjänst', parameter: 'coordinatedRescueService' },
            { value: 'environmentHealth', label: 'Miljö & Hälsa', parameter: 'coordinatedEnvironmentHealth' },
            {
              value: 'other',
              label: 'Annan',
              parameter: 'coordinatedOther',
              followUp: [{ kind: 'text', key: 'coordinatedOtherText', label: 'Vilken', narrow: true }],
            },
          ],
        },
      ],
    },
    {
      key: 'staffing',
      title: 'Förordnad ordningsvakt / entrévärd / serveringsansvarig (8:18)',
      position: 'before',
      fields: [
        {
          kind: 'choice',
          key: 'securityGuard',
          label: 'Förordnad ordningsvakt i tjänst',
          options: [
            yes('securityGuardYes', [{ kind: 'text', key: 'securityGuardCount', label: 'Antal', narrow: true }]),
            no('securityGuardNo'),
          ],
        },
        {
          kind: 'choice',
          key: 'entranceHost',
          label: 'Entrévärd enligt tillstånd vid tillsynstillfället',
          options: [
            yes('entranceHostYes', [{ kind: 'text', key: 'entranceHostCount', label: 'Antal', narrow: true }]),
            no('entranceHostNo'),
          ],
        },
        {
          kind: 'choice',
          key: 'responsiblePerson',
          label: 'Ägare eller serveringsansvarig på plats',
          options: [
            { value: 'present', label: 'Ja', parameter: 'responsiblePersonPresent' },
            { value: 'absent', label: 'Ingen serveringsansvarig på plats', parameter: 'responsiblePersonAbsent' },
          ],
        },
        {
          kind: 'choice',
          key: 'order',
          label: 'Ordning (3:5, 8:20)',
          options: [
            { value: 'withoutRemarks', label: 'Ordningen utan anmärkning', parameter: 'orderWithoutRemarks' },
            { value: 'withRemarks', label: 'Ordningen har brister', parameter: 'orderWithRemarks' },
          ],
        },
      ],
    },
    {
      key: 'remarks',
      title: 'Ytterligare beskrivning/anmärkning',
      position: 'after',
      fields: [{ kind: 'textarea', key: 'additionalRemarks', label: 'Beskrivning' }],
    },
    {
      key: 'summary',
      title: 'Summering av tillsynsbesök',
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
              followUp: [
                { kind: 'textarea', key: 'summaryActionRequiredText', label: 'Åtgärd' },
                { kind: 'date', key: 'followUpDate', label: 'Uppföljning av åtgärd senast', narrow: true },
              ],
            },
            {
              value: 'revisit',
              label: 'Inte fullt godkänd med återbesök',
              parameter: 'summaryNotApprovedRevisit',
              followUp: [{ kind: 'textarea', key: 'summaryRevisitText', label: 'Åtgärder, förbättringspunkter' }],
            },
            {
              value: 'investigation',
              label: 'Tillsynsutredning inleds',
              parameter: 'summaryInvestigationOpened',
              followUp: [{ kind: 'date', key: 'investigationDate', label: 'Datum', narrow: true }],
            },
          ],
        },
      ],
    },
    {
      key: 'inspectors',
      title: 'Kontroll utförd av',
      position: 'after',
      columns: 2,
      fields: [
        { kind: 'text', key: 'inspector1NameAndTitle', label: 'Namn, befattning', prefill: 'inspector' },
        { kind: 'text', key: 'inspector2NameAndTitle', label: 'Namn, befattning' },
      ],
    },
  ],
};
