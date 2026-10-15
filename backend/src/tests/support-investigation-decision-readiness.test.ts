import { resolveIafVofInvestigationClassificationPolicy } from '@/config/iaf-vof-investigation-classification';
import { VOF_SUPPORT_INVESTIGATION_PROFILE } from '@/config/support-investigation-profile';
import type { JsonSchema } from '@/data-contracts/jsonschema/data-contracts';
import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import type { SupportInvestigationState } from '@/dtos/support-investigation-profile.dto';
import {
  assertInvestigationCompletedBeforeDecision,
  assertMayCloseReportedMisconduct,
  assertMaySendToDecision,
  assertMayStartFollowUp,
  investigationNotCompletedMessage,
  LEX_HANDLER_CANNOT_START_FOLLOW_UP,
  LEX_INVESTIGATOR_CANNOT_SEND_TO_DECISION,
  REPORTED_MISCONDUCT_CLOSES_AT_WORKFLOW_END,
} from '@/services/support-investigation-decision-readiness';

import { mockUser } from './helpers/http';
import { mockMunicipalityId, mockSupportErrandId } from './helpers/mock-data';

const completionSchema = (id: string) =>
  ({
    id,
    value: { type: 'object', 'x-draken-completion': { field: 'completed', reportsField: 'reports' } },
  }) as unknown as JsonSchema;

const document = (key: string, value: Record<string, unknown>) => ({ key, schemaId: `2281_${key}_1.6`, value });

const setup = ({ state = 'active', withPolicy = true }: { state?: SupportInvestigationState; withPolicy?: boolean } = {}) => {
  const policyService = {
    iafVofClassificationPolicy: withPolicy ? resolveIafVofInvestigationClassificationPolicy(VOF_SUPPORT_INVESTIGATION_PROFILE) : undefined,
    profile: VOF_SUPPORT_INVESTIGATION_PROFILE,
    getState: vi.fn(async () => state),
  };
  const documentService = { readBoundSchema: vi.fn(async (_request: unknown, schemaId: string) => completionSchema(schemaId)) };
  const assertForPhase = (errand: Errand, targetPhaseName: string | undefined) =>
    assertInvestigationCompletedBeforeDecision({
      policyService,
      documentService,
      user: mockUser(),
      municipalityId: mockMunicipalityId,
      errandId: mockSupportErrandId,
      errand,
      targetPhaseName,
    });
  const assertFor = (errand: Errand) => assertForPhase(errand, 'DECISION');
  return { policyService, documentService, assertFor, assertForPhase };
};

const ordinaryDeviation = (jsonParameters: Errand['jsonParameters']) =>
  ({ parameters: [{ key: 'eventType', values: ['AVVIKELSE'] }], jsonParameters }) as Errand;
const reportedMisconduct = (jsonParameters: Errand['jsonParameters']) =>
  ({ parameters: [{ key: 'eventType', values: ['MISSFORHALLANDE'] }], jsonParameters }) as Errand;

describe('assertInvestigationCompletedBeforeDecision', () => {
  it("lets an ordinary deviation into the decision once the unit manager's investigation is saved as completed", async () => {
    const { assertFor, documentService } = setup();

    await expect(assertFor(ordinaryDeviation([document('utredning-enhetschef', { completed: 'yes' })]))).resolves.toBeUndefined();
    // Completed is what the bound schema declares, not an assumed field name.
    expect(documentService.readBoundSchema).toHaveBeenCalledWith(
      expect.objectContaining({ definition: expect.objectContaining({ key: 'utredning-enhetschef' }) }),
      '2281_utredning-enhetschef_1.6',
    );
  });

  it.each([
    ['is saved as a draft', [document('utredning-enhetschef', { completed: 'no' })]],
    ['is not saved at all', []],
  ])("refuses an ordinary deviation whose unit manager's investigation %s, and names it", async (_case, jsonParameters) => {
    const { assertFor } = setup();

    await expect(assertFor(ordinaryDeviation(jsonParameters))).rejects.toMatchObject({
      status: 422,
      message: investigationNotCompletedMessage('Utredning enhetschef'),
    });
  });

  it("does not let MAS/MAR's HSL investigation stand in for the unit manager's", async () => {
    const { assertFor } = setup();

    await expect(assertFor(ordinaryDeviation([document('utredning-hsl', { completed: 'yes' })]))).rejects.toMatchObject({ status: 422 });
  });

  it("holds a lex Sarah matter on the lex Sarah investigation, whatever the unit manager's says", async () => {
    const { assertFor } = setup();
    const managerDone = document('utredning-enhetschef', { completed: 'yes' });

    await expect(assertFor(reportedMisconduct([managerDone]))).rejects.toMatchObject({
      status: 422,
      message: investigationNotCompletedMessage('Utredning Lex Sarah'),
    });
    await expect(assertFor(reportedMisconduct([managerDone, document('utredning-sol-lss', { completed: 'yes' })]))).resolves.toBeUndefined();
  });

  it('holds a suspected misconduct on the lex Sarah investigation before the handover has changed its report type', async () => {
    const { assertFor } = setup();

    await expect(
      assertFor(ordinaryDeviation([document('utredning-enhetschef', { completed: 'yes', suspectedMisconduct: 'yes' })])),
    ).rejects.toMatchObject({ status: 422, message: investigationNotCompletedMessage('Utredning Lex Sarah') });
  });

  it('only guards the move into the decision phase', async () => {
    const { assertForPhase, policyService } = setup();

    await expect(assertForPhase(ordinaryDeviation([]), 'FOLLOW_UP')).resolves.toBeUndefined();
    await expect(assertForPhase(ordinaryDeviation([]), undefined)).resolves.toBeUndefined();
    expect(policyService.getState).not.toHaveBeenCalled();
  });

  it('waits for nothing where there is no IAF/VOF investigation, or it is switched off', async () => {
    await expect(setup({ withPolicy: false }).assertFor(ordinaryDeviation([]))).resolves.toBeUndefined();
    await expect(setup({ state: 'inactive' }).assertFor(ordinaryDeviation([]))).resolves.toBeUndefined();
  });

  it('refuses rather than waves through when the investigation state cannot be read', async () => {
    await expect(setup({ state: 'unavailable' }).assertFor(ordinaryDeviation([]))).rejects.toMatchObject({ status: 503 });
  });
});

describe('who may send the errand to the decision', () => {
  const handlerRoles = [
    { key: 'lex-ansvarig', label: 'LEX-ansvarig', group: 'MOCK_LEX_MANAGERS' },
    { key: 'lex-utredare', label: 'LEX-utredare', group: 'MOCK_LEX_INVESTIGATORS' },
  ];
  const policyService = { iafVofClassificationPolicy: resolveIafVofInvestigationClassificationPolicy(VOF_SUPPORT_INVESTIGATION_PROFILE) };
  const send =
    (groups: string[], targetPhaseName = 'DECISION', { rolesConfigured = true } = {}) =>
    () =>
      assertMaySendToDecision({
        policyService,
        handlerRoles: rolesConfigured ? handlerRoles : undefined,
        superadminGroups: ['mock_admins'],
        user: mockUser({ groups }),
        targetPhaseName,
      });

  it('refuses a LEX investigator, and says to hand the errand to a LEX manager', () => {
    expect(send(['MOCK_LEX_INVESTIGATORS'])).toThrow(LEX_INVESTIGATOR_CANNOT_SEND_TO_DECISION);
  });

  it('lets a LEX manager through, an investigator who is manager as well, and an administrator', () => {
    expect(send(['MOCK_LEX_MANAGERS'])).not.toThrow();
    expect(send(['MOCK_LEX_INVESTIGATORS', 'MOCK_LEX_MANAGERS'])).not.toThrow();
    expect(send(['MOCK_LEX_INVESTIGATORS', 'MOCK_ADMINS'])).not.toThrow();
  });

  it('holds nobody back on another phase, or where the deployment names no roles', () => {
    expect(send(['MOCK_LEX_INVESTIGATORS'], 'FOLLOW_UP')).not.toThrow();
    expect(send(['MOCK_LEX_INVESTIGATORS'], 'DECISION', { rolesConfigured: false })).not.toThrow();
  });
});

describe('who may start the follow-up', () => {
  const handlerRoles = [
    { key: 'enhetschef', label: 'Enhetschef', group: 'MOCK_UNIT_MANAGERS' },
    { key: 'lex-ansvarig', label: 'LEX-ansvarig', group: 'MOCK_LEX_MANAGERS' },
    { key: 'lex-utredare', label: 'LEX-utredare', group: 'MOCK_LEX_INVESTIGATORS' },
  ];
  const startFollowUp =
    (groups: string[], targetPhaseName = 'FOLLOW_UP', { rolesConfigured = true, withPolicy = true } = {}) =>
    () =>
      assertMayStartFollowUp({
        policyService: {
          iafVofClassificationPolicy: withPolicy ? resolveIafVofInvestigationClassificationPolicy(VOF_SUPPORT_INVESTIGATION_PROFILE) : undefined,
        },
        handlerRoles: rolesConfigured ? handlerRoles : undefined,
        superadminGroups: ['mock_admins'],
        user: mockUser({ groups }),
        targetPhaseName,
      });

  it('refuses a LEX manager and a LEX investigator, and says the unit manager takes it on', () => {
    expect(startFollowUp(['MOCK_LEX_MANAGERS'])).toThrow(LEX_HANDLER_CANNOT_START_FOLLOW_UP);
    expect(startFollowUp(['MOCK_LEX_INVESTIGATORS'])).toThrow(LEX_HANDLER_CANNOT_START_FOLLOW_UP);
    expect(startFollowUp(['MOCK_LEX_MANAGERS', 'MOCK_LEX_INVESTIGATORS'])).toThrow(LEX_HANDLER_CANNOT_START_FOLLOW_UP);
  });

  it('lets the unit manager through, a LEX handler who is unit manager as well, and an administrator', () => {
    expect(startFollowUp(['MOCK_UNIT_MANAGERS'])).not.toThrow();
    expect(startFollowUp(['MOCK_LEX_MANAGERS', 'MOCK_UNIT_MANAGERS'])).not.toThrow();
    expect(startFollowUp(['MOCK_LEX_MANAGERS', 'MOCK_ADMINS'])).not.toThrow();
  });

  it('holds nobody back without a handler role, on another phase, or outside IAF/VOF', () => {
    expect(startFollowUp([])).not.toThrow();
    expect(startFollowUp(['MOCK_LEX_MANAGERS'], 'DECISION')).not.toThrow();
    expect(startFollowUp(['MOCK_LEX_MANAGERS'], 'FOLLOW_UP', { rolesConfigured: false })).not.toThrow();
    expect(startFollowUp(['MOCK_LEX_MANAGERS'], 'FOLLOW_UP', { withPolicy: false })).not.toThrow();
  });
});

describe('closing a reported misconduct', () => {
  const close =
    (errand: Errand, closesBeforeWorkflowEnds: boolean, { withPolicy = true } = {}) =>
    () =>
      assertMayCloseReportedMisconduct({
        policyService: {
          iafVofClassificationPolicy: withPolicy ? resolveIafVofInvestigationClassificationPolicy(VOF_SUPPORT_INVESTIGATION_PROFILE) : undefined,
        },
        errand,
        closesBeforeWorkflowEnds,
      });

  it('refuses closing it before the workflow has run its course, whoever asks', () => {
    expect(close(reportedMisconduct([]), true)).toThrow(REPORTED_MISCONDUCT_CLOSES_AT_WORKFLOW_END);
  });

  it('closes it at the end of the workflow, and closes a deviation early as before', () => {
    expect(close(reportedMisconduct([]), false)).not.toThrow();
    expect(close(ordinaryDeviation([]), true)).not.toThrow();
  });

  it('holds nothing back outside IAF/VOF', () => {
    expect(close(reportedMisconduct([]), true, { withPolicy: false })).not.toThrow();
  });
});
