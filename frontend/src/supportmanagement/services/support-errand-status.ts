/**
 * The status and resolution vocabulary of a support errand.
 *
 * This module is deliberately dependency-free. `support-errand-service.ts` pulls in React, the
 * stores and the HTTP client; the errand policy (`../policy/support-errand-policy.ts`) and the
 * dragon modules under `src/dragons/` only need these names, and importing them from the service
 * would close an import cycle (service -> policy -> service). The service re-exports everything
 * here, so existing importers keep their import path.
 */

export enum Status {
  NEW = 'NEW',
  ONGOING = 'ONGOING',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  ASSIGNED = 'ASSIGNED',
  SOLVED = 'SOLVED',
  AWAITING_INTERNAL_RESPONSE = 'AWAITING_INTERNAL_RESPONSE',
  UPSTART = 'UPSTART',
  PUBLISH_SELECTION = 'PUBLISH_SELECTION',
  INTERNAL_CONTROL_AND_INTERVIEWS = 'INTERNAL_CONTROL_AND_INTERVIEWS',
  REFERENCE_CHECK = 'REFERENCE_CHECK',
  REVIEW = 'REVIEW',
  SECURITY_CLEARENCE = 'SECURITY_CLEARENCE',
  FEEDBACK_CLOSURE = 'FEEDBACK_CLOSURE',
  SUBPACKAGE_HANDLED = 'SUBPACKAGE_HANDLED',
  REOPENED = 'REOPENED',
}

// The status groups behind the overview sidebar: each button filters on one group and the
// counts are fetched per group. Which statuses count as ongoing is the one group a dragon may
// widen; it does so through its SupportErrandPolicy, never by editing this list.
export const newStatuses = [Status.NEW];

export const ongoingStatuses = [Status.ONGOING, Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE, Status.REOPENED];

export const suspendedStatuses = [Status.SUSPENDED];
export const assignedStatuses = [Status.ASSIGNED];

export const closedStatuses = [Status.SOLVED];

export enum Resolution {
  SOLVED = 'SOLVED',
  REFERRED_VIA_EXCHANGE = 'REFERRED_VIA_EXCHANGE',
  CONNECTED = 'CONNECTED',
  REGISTERED_EXTERNAL_SYSTEM = 'REGISTERED_EXTERNAL_SYSTEM',
  SELF_SERVICE = 'SELF_SERVICE',
  INTERNAL_SERVICE = 'INTERNAL_SERVICE',
  CLOSED = 'CLOSED',
  BACK_TO_MANAGER = 'BACK_TO_MANAGER',
  BACK_TO_HR = 'BACK_TO_HR',
  REFER_TO_CONTACTSUNDSVALL = 'REFER_TO_CONTACTSUNDSVALL',
  REFER_TO_PHONE = 'REFER_TO_PHONE',
  REGISTERED = 'REGISTERED',
  SENT_MESSAGE = 'SENT_MESSAGE',
  NEED_MET = 'NEED_MET',
  RECRUITED_FEWER = 'RECRUITED_FEWER',
  RECRUITED_MORE = 'RECRUITED_MORE',
  CANCELLED = 'CANCELLED',
  SECURE_APPBOX = 'SECURE_APPBOX',
  BACK_TO_CONTACT_SUNDSVALL = 'BACK_TO_CONTACT_SUNDSVALL',
  FORWARDED_TO_DRAKFASTIGHETER = 'FORWARDED_TO_DRAKFASTIGHETER',
  FORWARDED_TO_EXTERNAL_LANDLORD = 'FORWARDED_TO_EXTERNAL_LANDLORD',
  FORWARDED_TO_INTERNAL_CONTRACTOR = 'FORWARDED_TO_INTERNAL_CONTRACTOR',
  FORWARDED_TO_EXTERNAL_CONTRACTOR = 'FORWARDED_TO_EXTERNAL_CONTRACTOR',
}
