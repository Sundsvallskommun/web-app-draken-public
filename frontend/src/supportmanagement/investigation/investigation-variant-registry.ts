import { appConfig } from '@config/appconfig';

import { aotInvestigationVariant } from './aot/aot-investigation-variant';
import { avvikelseInvestigationVariant } from './avvikelse/avvikelse-investigation-variant';
import {
  type InvestigationVariantModule,
  type InvestigationViewer,
  resolveInvestigationAdministration,
  resolveInvestigationVariant,
} from './investigation-variant';

/**
 * Every investigation implementation. Adding one is adding a module here plus its capability flag.
 *
 * Order is load-bearing: selection is first-wins, so a deployment that wrongly enables two
 * capabilities keeps the behaviour of whichever is listed first. Avvikelse stays first so that
 * misconfiguration degrades to today's behaviour rather than to a placeholder.
 */
const VARIANTS: readonly InvestigationVariantModule[] = Object.freeze([
  avvikelseInvestigationVariant,
  aotInvestigationVariant,
]);

export const getInvestigationVariant = (): InvestigationVariantModule | null =>
  resolveInvestigationVariant(appConfig.features, VARIANTS);

/**
 * The follow-up across errands the running variant offers, if any. The master switch turns it off with
 * the rest of the investigation, as it does the tabs.
 */
export const getInvestigationFollowUp = (): InvestigationVariantModule['followUp'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.followUp : undefined;

/**
 * What the running variant lets this viewer administer from the overview, if anything: undefined for a variant
 * without the slot, and for a viewer it is not offered to.
 */
export const getInvestigationAdministration = (
  viewer: InvestigationViewer
): InvestigationVariantModule['administration'] =>
  resolveInvestigationAdministration(appConfig.features, getInvestigationVariant(), viewer);

/** What the running variant says the messages are for, where it has its own word on it. */
export const getInvestigationMessagesIntroduction = (): InvestigationVariantModule['messagesIntroduction'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.messagesIntroduction : undefined;

/** The channels the running variant lets a user choose to be notified on, if it offers a choice. */
export const getInvestigationNotificationChannels = (): InvestigationVariantModule['notificationChannels'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.notificationChannels : undefined;

/** The fields the running variant adds beside Ansvarig in the sidebar, if any. */
export const getInvestigationHandlerFields = (): InvestigationVariantModule['renderHandlerFields'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.renderHandlerFields : undefined;

/** Whether the errand's assignee alone follows it under the running variant. False for every drake without the slot. */
export const getInvestigationAssigneeFollowsErrand = (): boolean =>
  appConfig.features.useInvestigation ? Boolean(getInvestigationVariant()?.assigneeFollowsErrand) : false;

/** Whether the running variant does without Ta ärende. False for every drake without the slot. */
export const getInvestigationWithoutTakeErrand = (): boolean =>
  appConfig.features.useInvestigation ? Boolean(getInvestigationVariant()?.withoutTakeErrand) : false;

/** The running variant's filter checkbox for the overview, if it has one, whoever it is offered to. */
export const getInvestigationOverviewFilterToggle = (): InvestigationVariantModule['overviewFilterToggle'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.overviewFilterToggle : undefined;

/** The stakeholder roles the running variant offers no employee search for, if any. */
export const getInvestigationRolesWithoutEmployeeSearch =
  (): InvestigationVariantModule['rolesWithoutEmployeeSearch'] =>
    appConfig.features.useInvestigation ? getInvestigationVariant()?.rolesWithoutEmployeeSearch : undefined;

/** The documents the running variant keeps out of the viewer's sight, if it conceals any. */
export const getInvestigationConcealedDocumentKeys = (): InvestigationVariantModule['concealedDocumentKeys'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.concealedDocumentKeys : undefined;

/** Whether the running variant keeps an errand from closing before its workflow ends, if it has a say in it. */
export const getInvestigationClosesOnlyAtWorkflowEnd = (): InvestigationVariantModule['closesOnlyAtWorkflowEnd'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.closesOnlyAtWorkflowEnd : undefined;

/** How the running variant lets an errand close before its workflow ends, if it has a say in it. */
export const getInvestigationEarlyClose = (): InvestigationVariantModule['earlyClose'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.earlyClose : undefined;

/** Whether the running variant moves the errand's status by its own actions, leaving no status to choose. */
export const getInvestigationStatusFollowsWorkflow = (): boolean =>
  appConfig.features.useInvestigation ? Boolean(getInvestigationVariant()?.statusFollowsWorkflow) : false;

/** The running variant's own name for a channel, where it has one. Undefined for every other channel and drake. */
export const getInvestigationChannelLabel = (channel: string | undefined): string | undefined =>
  appConfig.features.useInvestigation && channel ? getInvestigationVariant()?.channelLabels?.[channel] : undefined;

/** Whether the running variant does without parked errands. False for every drake without the slot. */
export const getInvestigationWithoutSuspension = (): boolean =>
  appConfig.features.useInvestigation ? Boolean(getInvestigationVariant()?.withoutSuspension) : false;

/** What the errand's handler does next, where the running variant says. */
export const getInvestigationNextStep = (): InvestigationVariantModule['nextStep'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.nextStep : undefined;

/** Who the overview names as responsible for an errand, where the running variant has a say in it. */
export const getInvestigationOverviewAssignee = (): InvestigationVariantModule['overviewAssignee'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.overviewAssignee : undefined;

/** The alert the running variant shows on an errand the user may only know of, if it asks at all. */
export const getInvestigationLimitedAccessNotice = (): InvestigationVariantModule['limitedAccessNotice'] =>
  appConfig.features.useInvestigation ? getInvestigationVariant()?.limitedAccessNotice : undefined;
