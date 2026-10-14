import type { Measure } from '@common/data-contracts/supportmanagement/data-contracts';
import type { User } from '@common/interfaces/user';
import dayjs from 'dayjs';

import type { SupportErrand } from './support-errand-service';
import { SupportMeasureResult } from './support-measure-service';

export const VISIT = { PREMISES: 'premises', CLOSED: 'closed' } as const;
export const YES_NO = { YES: 'yes', NO: 'no' } as const;
export const RESPONSIBLE = { PRESENT: 'present', ABSENT: 'absent' } as const;
export const ORDER = { WITHOUT_REMARKS: 'withoutRemarks', WITH_REMARKS: 'withRemarks' } as const;
export const SUMMARY = {
  APPROVED: 'approved',
  ACTION_REQUIRED: 'actionRequired',
  REVISIT: 'revisit',
  INVESTIGATION: 'investigation',
} as const;
export const COORDINATED = {
  NONE: 'none',
  POLICE: 'police',
  TAX_AGENCY: 'taxAgency',
  RESCUE_SERVICE: 'rescueService',
  ENVIRONMENT_HEALTH: 'environmentHealth',
  OTHER: 'other',
} as const;

type Values<T> = T[keyof T];
export type CoordinatedParty = Values<typeof COORDINATED>;

/**
 * What the handler fills in besides the control points, as the paper protocol asks it. Kept on the page only,
 * until a json-schema exists to file it on the errand. Exclusive choices are one value, '' means not chosen.
 */
export interface InspectionProtocolDetails {
  inspectionDate: string;
  premisesName: string;
  premisesAddress: string;
  permitHolderName: string;
  permitHolderOrgNumber: string;
  visitStartTime: string;
  visitEndTime: string;
  guestCount: string;
  visit: Values<typeof VISIT> | '';
  coordinatedWith: CoordinatedParty[];
  coordinatedOtherText: string;
  securityGuard: Values<typeof YES_NO> | '';
  securityGuardCount: string;
  entranceHost: Values<typeof YES_NO> | '';
  entranceHostCount: string;
  responsiblePerson: Values<typeof RESPONSIBLE> | '';
  order: Values<typeof ORDER> | '';
  additionalRemarks: string;
  inspector1NameAndTitle: string;
  inspector2NameAndTitle: string;
  summary: Values<typeof SUMMARY> | '';
  summaryActionRequiredText: string;
  followUpDate: string;
  summaryRevisitText: string;
  investigationDate: string;
}

/** A row of the Kontrollpunkter table: U.A for a completed point, A for one not completed, neither otherwise. */
export interface InspectionProtocolMeasureRow {
  title: string;
  noRemark: 'X' | '';
  remark: 'X' | '';
  comment: string;
}

const join = (...parts: (string | undefined)[]): string => parts.filter(Boolean).join(', ');

/** What the errand already knows; the rest is typed in during the visit. */
export const inspectionProtocolDetailsOf = (
  errand: Pick<SupportErrand, 'customer'> | undefined,
  user: Pick<User, 'name'> | undefined
): InspectionProtocolDetails => {
  const holder = errand?.customer?.[0];
  return {
    inspectionDate: dayjs().format('YYYY-MM-DD'),
    premisesName: '',
    premisesAddress: '',
    permitHolderName: holder?.organizationName || join(holder?.firstName, holder?.lastName).replace(', ', ' '),
    permitHolderOrgNumber: holder?.organizationNumber ?? '',
    visitStartTime: '',
    visitEndTime: '',
    guestCount: '',
    visit: '',
    coordinatedWith: [],
    coordinatedOtherText: '',
    securityGuard: '',
    securityGuardCount: '',
    entranceHost: '',
    entranceHostCount: '',
    responsiblePerson: '',
    order: '',
    additionalRemarks: '',
    inspector1NameAndTitle: join(user?.name, user?.name ? 'handläggare' : undefined),
    inspector2NameAndTitle: '',
    summary: '',
    summaryActionRequiredText: '',
    followUpDate: '',
    summaryRevisitText: '',
    investigationDate: '',
  };
};

export const inspectionProtocolMeasureRow = (measure: Measure): InspectionProtocolMeasureRow => ({
  title: measure.title ?? '',
  noRemark: measure.result === SupportMeasureResult.COMPLETED ? 'X' : '',
  remark: measure.result === SupportMeasureResult.NOT_COMPLETED ? 'X' : '',
  comment: measure.description ?? '',
});

/** The template's box() macro prints a cross for the value "true"; the table marks are printed as they are. */
const box = (checked: boolean): string => (checked ? 'true' : '');

/** The flat keys the template reads, plus `measures` for its loop. Every box is sent, checked or not. */
export const toInspectionProtocolParameters = (
  caseNumber: string | undefined,
  details: InspectionProtocolDetails,
  measures: Measure[]
): Record<string, string | InspectionProtocolMeasureRow[]> => {
  const coordinated = (party: CoordinatedParty) => box(details.coordinatedWith.includes(party));
  return {
    caseNumber: caseNumber ?? '',
    inspectionDate: details.inspectionDate,
    premisesName: details.premisesName,
    premisesAddress: details.premisesAddress,
    permitHolderName: details.permitHolderName,
    permitHolderOrgNumber: details.permitHolderOrgNumber,
    visitStartTime: details.visitStartTime,
    visitEndTime: details.visitEndTime,
    guestCount: details.guestCount,
    visitInPremises: box(details.visit === VISIT.PREMISES),
    visitClosed: box(details.visit === VISIT.CLOSED),
    coordinatedNone: coordinated(COORDINATED.NONE),
    coordinatedPolice: coordinated(COORDINATED.POLICE),
    coordinatedTaxAgency: coordinated(COORDINATED.TAX_AGENCY),
    coordinatedRescueService: coordinated(COORDINATED.RESCUE_SERVICE),
    coordinatedEnvironmentHealth: coordinated(COORDINATED.ENVIRONMENT_HEALTH),
    coordinatedOther: coordinated(COORDINATED.OTHER),
    coordinatedOtherText: details.coordinatedOtherText,
    securityGuardYes: box(details.securityGuard === YES_NO.YES),
    securityGuardCount: details.securityGuardCount,
    securityGuardNo: box(details.securityGuard === YES_NO.NO),
    entranceHostYes: box(details.entranceHost === YES_NO.YES),
    entranceHostCount: details.entranceHostCount,
    entranceHostNo: box(details.entranceHost === YES_NO.NO),
    responsiblePersonPresent: box(details.responsiblePerson === RESPONSIBLE.PRESENT),
    responsiblePersonAbsent: box(details.responsiblePerson === RESPONSIBLE.ABSENT),
    orderWithoutRemarks: box(details.order === ORDER.WITHOUT_REMARKS),
    orderWithRemarks: box(details.order === ORDER.WITH_REMARKS),
    measures: measures.map(inspectionProtocolMeasureRow),
    additionalRemarks: details.additionalRemarks,
    inspector1NameAndTitle: details.inspector1NameAndTitle,
    inspector2NameAndTitle: details.inspector2NameAndTitle,
    summaryApproved: box(details.summary === SUMMARY.APPROVED),
    summaryApprovedActionRequired: box(details.summary === SUMMARY.ACTION_REQUIRED),
    summaryActionRequiredText: details.summaryActionRequiredText,
    followUpDate: details.followUpDate,
    summaryNotApprovedRevisit: box(details.summary === SUMMARY.REVISIT),
    summaryRevisitText: details.summaryRevisitText,
    summaryInvestigationOpened: box(details.summary === SUMMARY.INVESTIGATION),
    investigationDate: details.investigationDate,
  };
};

export const inspectionProtocolFileName = (errandNumber: string | undefined, date: string): string =>
  `Tillsynsprotokoll ${[errandNumber, date].filter(Boolean).join(' ')}.pdf`;
