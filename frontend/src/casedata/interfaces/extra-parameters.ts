import { UiPhase } from './errand-phase';

export type DisabilityAid = 'Rullator' | 'Elrullstol' | 'Krycka/kryckor/käpp' | 'Rullstol (manuell)' | 'Inget';
export interface ApiExtraParameters {
  'application.reason'?: string;
  'application.role'?: 'SELF' | 'GUARDIAN' | 'CUSTODIAN';
  'application.applicant.capacity'?: 'DRIVER' | 'PASSENGER';
  'application.applicant.testimonial'?: 'true' | 'false';
  'application.applicant.signingAbility'?: 'true' | 'false';
  'disability.aid'?: string;
  'disability.walkingAbility'?: 'true' | 'false';
  'disability.walkingDistance.beforeRest'?: string;
  'disability.walkingDistance.max'?: string;
  'disability.duration'?: string;
  'disability.canBeAloneWhileParking'?: 'true' | 'false';
  'disability.canBeAloneWhileParking.note'?: string;
  'consent.contact.doctor'?: 'true' | 'false';
  'consent.view.transportationServiceDetails'?: 'true' | 'false';
  'application.renewal.changedCircumstances'?: 'Y' | 'N';
  'application.renewal.expirationDate'?: string; // YYYY-MM-DD
  'application.renewal.medicalConfirmationRequired'?: 'yes' | 'no' | 'unknown';
  'application.lostPermit.policeReportNumber'?: string;
  'artefact.permit.number'?: string;
  'artefact.permit.status'?: string;
  'application.supplement.dueDate'?: string;
  'process.displayPhase'?: UiPhase;
  'process.phaseAction'?: 'COMPLETE' | 'CANCEL' | 'UNKNOWN';
  'process.phaseStatus'?: 'COMPLETED' | 'ONGOING' | 'WAITING' | 'CANCELED';
}

export type ExtraParameters = ApiExtraParameters;

export type GenericExtraParameters = { [key: string]: string };
