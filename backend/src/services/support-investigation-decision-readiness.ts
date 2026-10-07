import { type HandlerGroupRole, resolveHeldHandlerRoleKeys } from '@/config/handler-group-roles';
import { IAF_VOF_DECISION_PHASE_NAME, resolveIafVofDecisionInvestigationDocumentKey } from '@/config/iaf-vof-decision-investigation';
import { LEX_INVESTIGATOR_ROLE_KEY, LEX_MANAGER_ROLE_KEY } from '@/config/investigation-handover-steps';
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

interface AssertMaySendToDecisionRequest {
  readonly policyService: Pick<SupportInvestigationPolicyService, 'iafVofClassificationPolicy'>;
  readonly handlerRoles: readonly HandlerGroupRole[] | undefined;
  /** The superadmin groups, lowercased: an administrator is not held back by a role they also happen to hold. */
  readonly superadminGroups: readonly string[];
  readonly user: User;
  /** The name of the phase the write would move the errand into. */
  readonly targetPhaseName: string | undefined;
}

/**
 * Refuses a LEX investigator who would move an IAF/VOF errand into the decision phase. The investigator
 * investigates; a LEX manager sends the errand on to the decision, so the investigator hands it to one. Somebody
 * who is LEX manager as well is a manager. A deployment that names no handler roles has no investigator to hold back.
 */
export const assertMaySendToDecision = ({
  policyService,
  handlerRoles,
  superadminGroups,
  user,
  targetPhaseName,
}: AssertMaySendToDecisionRequest): void => {
  if (targetPhaseName !== IAF_VOF_DECISION_PHASE_NAME || !policyService.iafVofClassificationPolicy || !handlerRoles?.length) return;
  const groups = user.groups ?? [];
  if (groups.some(group => superadminGroups.includes(group.trim().toLowerCase()))) return;
  const held = resolveHeldHandlerRoleKeys(handlerRoles, groups);
  if (held.includes(LEX_INVESTIGATOR_ROLE_KEY) && !held.includes(LEX_MANAGER_ROLE_KEY)) {
    throw new HttpException(422, LEX_INVESTIGATOR_CANNOT_SEND_TO_DECISION);
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
