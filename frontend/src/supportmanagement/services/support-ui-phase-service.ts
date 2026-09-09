import { Status, SupportErrand } from './support-errand-service';

export enum SupportUiPhase {
  REGISTERED = 'REGISTERED',
  REVIEW = 'REVIEW',
  INVESTIGATION = 'INVESTIGATION',
  DECISION = 'DECISION',
  FOLLOW_UP = 'FOLLOW_UP',
  CLOSED = 'CLOSED',
}

export const SUPPORT_UI_PHASE_ORDER: SupportUiPhase[] = [
  SupportUiPhase.REGISTERED,
  SupportUiPhase.REVIEW,
  SupportUiPhase.INVESTIGATION,
  SupportUiPhase.DECISION,
  SupportUiPhase.FOLLOW_UP,
  SupportUiPhase.CLOSED,
];

const PHASE_BY_STATUS: Partial<Record<Status, SupportUiPhase>> = {
  [Status.NEW]: SupportUiPhase.REGISTERED,
  [Status.ASSIGNED]: SupportUiPhase.REVIEW,
  [Status.ONGOING]: SupportUiPhase.REVIEW,
  [Status.PENDING]: SupportUiPhase.REVIEW,
  [Status.AWAITING_INTERNAL_RESPONSE]: SupportUiPhase.REVIEW,
  [Status.SUSPENDED]: SupportUiPhase.REVIEW,
  [Status.SOLVED]: SupportUiPhase.CLOSED,
};

export const getSupportUiPhase = (errand?: SupportErrand): SupportUiPhase | undefined =>
  errand?.status ? PHASE_BY_STATUS[errand.status as Status] : undefined;

export const supportUiPhaseTranslationKey = (phase: SupportUiPhase): string =>
  `common:ui_phases.${phase.toLowerCase()}`;
