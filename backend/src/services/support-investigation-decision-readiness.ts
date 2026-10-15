import { type HandlerGroupRole, resolveHeldHandlerRoleKeys } from '@/config/handler-group-roles';
import {
  IAF_VOF_DECISION_PHASE_NAME,
  IAF_VOF_FOLLOW_UP_PHASE_NAME,
  resolveIafVofDecisionInvestigationDocumentKey,
} from '@/config/iaf-vof-decision-investigation';
import { resolveIafVofInvestigationDocumentApplicability } from '@/config/iaf-vof-investigation-classification';
import { LEX_HANDLER_ROLE_KEYS, LEX_INVESTIGATOR_ROLE_KEY, LEX_MANAGER_ROLE_KEY } from '@/config/investigation-handover-steps';
import type { Errand } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import { User } from '@/interfaces/users.interface';

import { isJsonObject } from './schema-bound-json.service';
import { SupportInvestigationPolicyService } from './support-investigation-policy.service';
import { isDocumentCompleted, SupportJsonParameterService } from './support-json-parameter.service';

/** The refusal names the investigation by its tab, so the handler knows which one to finish. */
export const investigationNotCompletedMessage = (tabLabel: string): string =>
  `Ärendet kan inte skickas till beslut förrän ${tabLabel} är markerad som klar och sparad.`;

export const LEX_INVESTIGATOR_CANNOT_SEND_TO_DECISION =
  'Som LEX-utredare skickar du inte ärendet till beslut. Tilldela det till en LEX-ansvarig, som tar det vidare.';

export const LEX_HANDLER_CANNOT_START_FOLLOW_UP =
  'Uppföljningen görs av enheten. Återlämna ärendet till chefen, som tar det vidare till uppföljning.';

export const REPORTED_MISCONDUCT_CLOSES_AT_WORKFLOW_END = 'Ett missförhållande avslutas först när processen är klar, från uppföljningen.';

interface AssertMayEnterPhaseRequest {
  readonly policyService: Pick<SupportInvestigationPolicyService, 'iafVofClassificationPolicy'>;
  readonly handlerRoles: readonly HandlerGroupRole[] | undefined;
  /** The superadmin groups, lowercased: an administrator is not held back by a role they also happen to hold. */
  readonly superadminGroups: readonly string[];
  readonly user: User;
  /** The name of the phase the write would move the errand into. */
  readonly targetPhaseName: string | undefined;
}

/**
 * The handler roles a user holds where an IAF/VOF role rule applies to them. Undefined for an application
 * without the IAF/VOF policy, a deployment that names no handler roles, and an administrator: none of them
 * has a role to be held back by.
 */
const heldIafVofHandlerRoleKeys = ({
  policyService,
  handlerRoles,
  superadminGroups,
  user,
}: Omit<AssertMayEnterPhaseRequest, 'targetPhaseName'>): string[] | undefined => {
  if (!policyService.iafVofClassificationPolicy || !handlerRoles?.length) return undefined;
  const groups = user.groups ?? [];
  if (groups.some(group => superadminGroups.includes(group.trim().toLowerCase()))) return undefined;
  return resolveHeldHandlerRoleKeys(handlerRoles, groups);
};

/**
 * Refuses a LEX investigator who would move an IAF/VOF errand into the decision phase. The investigator
 * investigates; a LEX manager sends the errand on to the decision, so the investigator hands it to one. Somebody
 * who is LEX manager as well is a manager. A deployment that names no handler roles has no investigator to hold back.
 */
export const assertMaySendToDecision = ({ targetPhaseName, ...request }: AssertMayEnterPhaseRequest): void => {
  if (targetPhaseName !== IAF_VOF_DECISION_PHASE_NAME) return;
  const held = heldIafVofHandlerRoleKeys(request);
  if (held?.includes(LEX_INVESTIGATOR_ROLE_KEY) && !held.includes(LEX_MANAGER_ROLE_KEY)) {
    throw new HttpException(422, LEX_INVESTIGATOR_CANNOT_SEND_TO_DECISION);
  }
};

/**
 * Refuses a LEX handler who would move an IAF/VOF errand into the follow-up phase. Following up the measures is
 * the unit's work: LEX hands the decided errand back to the unit manager, who starts it. Somebody who holds a
 * role besides the LEX ones may be acting in that one, so only a handler who is LEX and nothing else is held back.
 */
export const assertMayStartFollowUp = ({ targetPhaseName, ...request }: AssertMayEnterPhaseRequest): void => {
  if (targetPhaseName !== IAF_VOF_FOLLOW_UP_PHASE_NAME) return;
  const held = heldIafVofHandlerRoleKeys(request);
  if (held?.length && held.every(roleKey => LEX_HANDLER_ROLE_KEYS.includes(roleKey))) {
    throw new HttpException(422, LEX_HANDLER_CANNOT_START_FOLLOW_UP);
  }
};

interface AssertMayCloseRequest {
  readonly policyService: Pick<SupportInvestigationPolicyService, 'iafVofClassificationPolicy'>;
  readonly errand: Pick<Errand, 'parameters' | 'labels'>;
  /** The close has to move the errand through phases first: it is not yet in the phase its workflow closes from. */
  readonly closesBeforeWorkflowEnds: boolean;
}

/**
 * Refuses closing an IAF/VOF reported misconduct before its workflow has run its course. A misconduct goes to LEX,
 * is decided and is followed up; a close that skips that is refused whoever asks. The close at the end of the
 * workflow, from the follow-up, is untouched.
 */
export const assertMayCloseReportedMisconduct = ({ policyService, errand, closesBeforeWorkflowEnds }: AssertMayCloseRequest): void => {
  if (!closesBeforeWorkflowEnds || !policyService.iafVofClassificationPolicy) return;
  if (resolveIafVofInvestigationDocumentApplicability(errand) === 'reported-misconduct') {
    throw new HttpException(422, REPORTED_MISCONDUCT_CLOSES_AT_WORKFLOW_END);
  }
};

interface AssertInvestigationCompletedRequest {
  readonly policyService: Pick<SupportInvestigationPolicyService, 'iafVofClassificationPolicy' | 'profile' | 'getState'>;
  readonly documentService: Pick<SupportJsonParameterService, 'readBoundSchema'>;
  readonly user: User;
  readonly municipalityId: string;
  readonly errandId: string;
  /** The errand as the phase write read it, with its JSON parameters. */
  readonly errand: Errand;
  /** The name of the phase the write would move the errand into. */
  readonly targetPhaseName: string | undefined;
}

/**
 * Refuses to move an IAF/VOF errand into the decision phase until the investigation it is decided on
 * has been saved as completed - the same `x-draken-completion` mark that locks the document.
 *
 * Which investigation that is belongs to `resolveIafVofDecisionInvestigationDocumentKey`. This only
 * applies it: an application without the IAF/VOF policy, or with investigation switched off, has no
 * investigation to wait for, and one whose investigation state cannot be read is refused rather than
 * waved through.
 */
export const assertInvestigationCompletedBeforeDecision = async ({
  policyService,
  documentService,
  user,
  municipalityId,
  errandId,
  errand,
  targetPhaseName,
}: AssertInvestigationCompletedRequest): Promise<void> => {
  if (targetPhaseName !== IAF_VOF_DECISION_PHASE_NAME) return;
  const policy = policyService.iafVofClassificationPolicy;
  if (!policy) return;

  const state = await policyService.getState(user);
  if (state === 'inactive') return;
  if (state === 'unavailable') throw new HttpException(503, 'Investigation policy is temporarily unavailable');

  const key = resolveIafVofDecisionInvestigationDocumentKey(policy, errand);
  const definition = policyService.profile.documents.find(document => document.key === key);
  if (!definition) throw new HttpException(502, `Investigation profile is missing the ${key} document`);

  // 422 rather than 409, as for the measures before closing: the errand is as the handler left it,
  // and the message names what is missing.
  const saved = errand.jsonParameters?.find(parameter => parameter.key === key);
  const refusal = new HttpException(422, investigationNotCompletedMessage(definition.tabLabel));
  if (!saved?.schemaId || !isJsonObject(saved.value)) throw refusal;

  // Completed means what the BFF locks the document on, so the declaration is read from the schema
  // the document is bound to rather than assumed.
  const schema = await documentService.readBoundSchema({ definition, municipalityId, errandId, user }, saved.schemaId);
  if (!isDocumentCompleted(schema, saved.value)) throw refusal;
};
