import { Resolution, Status } from '@supportmanagement/services/support-errand-service';
import { SupportProcessStep, SupportProcessStepName } from '@supportmanagement/services/support-process-service';
import { ArrowRight } from 'lucide-react';
import { ReactElement } from 'react';

export interface ProcessAction {
  key: string;
  variant: 'primary' | 'secondary';
  color?: 'vattjom';
  icon?: ReactElement;
  needsSignal: boolean;
  /** Starts the process instead of stepping it. */
  startsProcess?: boolean;
  /** Every step is confirmed in a dialog, except starting the handling, which never was. */
  confirms?: boolean;
  /** Takes the errand and sets it ongoing before the signal, the way the handling has always started. */
  takesErrand?: boolean;
  requiresDecisionOutcome?: boolean;
  requiresAnsweredStatements?: boolean;
  /** What the permit certificate prints has to be on the errand before the process needs it. */
  requiresPermitInputs?: boolean;
  completesDecision?: boolean;
  completesInvestigation?: boolean;
  tabKey?: string;
  closesErrand?: boolean;
  resolution?: Resolution;
}

/** Manual start for labels with processStartMode MANUAL. Not a step: no process exists yet. */
export const START_ACTION: ProcessAction = {
  key: 'start_process',
  variant: 'primary',
  color: 'vattjom',
  icon: <ArrowRight size={18} />,
  needsSignal: false,
  startsProcess: true,
  confirms: false,
};

/** Parked, solved and reopened errands are picked up from their own buttons, never started again. */
export const RESUMED_ELSEWHERE = new Set([Status.SUSPENDED, Status.SOLVED, Status.REOPENED]);

/**
 * What the handler does to leave a step, in the words of the business. The signal that carries it
 * comes from the process, so a model that renames its gates needs no change here.
 */
export const STEP_ACTIONS: Partial<Record<SupportProcessStepName, ProcessAction>> = {
  [SupportProcessStep.REGISTRATION]: {
    key: 'start_handling',
    variant: 'primary',
    color: 'vattjom',
    icon: <ArrowRight size={18} />,
    needsSignal: true,
    confirms: false,
    takesErrand: true,
  },
  [SupportProcessStep.REVIEW]: {
    key: 'start_investigation',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'investigation',
    requiresPermitInputs: true,
  },
  [SupportProcessStep.INVESTIGATION]: {
    key: 'ready_for_decision',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'decision',
    requiresAnsweredStatements: true,
    completesInvestigation: true,
  },
  [SupportProcessStep.DECISION]: {
    key: 'start_follow_up',
    variant: 'primary',
    needsSignal: true,
    tabKey: 'followup',
    requiresDecisionOutcome: true,
    completesDecision: true,
  },
  [SupportProcessStep.FOLLOW_UP]: {
    key: 'close_errand',
    variant: 'primary',
    needsSignal: true,
    closesErrand: true,
    resolution: Resolution.CLOSED,
  },
  [SupportProcessStep.CLOSING]: {
    key: 'close_errand',
    variant: 'primary',
    needsSignal: true,
    closesErrand: true,
    resolution: Resolution.CLOSED,
  },
};

export const signalIsRequired = (action: ProcessAction, processIsOver: boolean): boolean =>
  action.needsSignal && !action.completesDecision && !processIsOver;
