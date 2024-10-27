export enum PTCaseType {
  PARKING_PERMIT = 'PARKING_PERMIT',
  PARKING_PERMIT_RENEWAL = 'PARKING_PERMIT_RENEWAL',
  LOST_PARKING_PERMIT = 'LOST_PARKING_PERMIT',
}

export enum MEXCaseType {
  MEX_LEASE_REQUEST = 'MEX_LEASE_REQUEST',
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY = 'MEX_BUY_LAND_FROM_THE_MUNICIPALITY',
  MEX_SELL_LAND_TO_THE_MUNICIPALITY = 'MEX_SELL_LAND_TO_THE_MUNICIPALITY',
  MEX_APPLICATION_SQUARE_PLACE = 'MEX_APPLICATION_SQUARE_PLACE',
  MEX_BUY_SMALL_HOUSE_PLOT = 'MEX_BUY_SMALL_HOUSE_PLOT',
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE = 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE',
  MEX_UNAUTHORIZED_RESIDENCE = 'MEX_UNAUTHORIZED_RESIDENCE',
  MEX_LAND_RIGHT = 'MEX_LAND_RIGHT',
  MEX_EARLY_DIALOG_PLAN_NOTIFICATION = 'MEX_EARLY_DIALOG_PLAN_NOTIFICATION',
  MEX_FORWARDED_FROM_CONTACTSUNDSVALL = 'MEX_FORWARDED_FROM_CONTACTSUNDSVALL',
  MEX_PROTECTIVE_HUNTING = 'MEX_PROTECTIVE_HUNTING',
  MEX_LAND_INSTRUCTION = 'MEX_LAND_INSTRUCTION',
  MEX_OTHER = 'MEX_OTHER',
  MEX_LAND_SURVEYING_OFFICE = 'MEX_LAND_SURVEYING_OFFICE',
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE = 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE',
  MEX_INVOICE = 'MEX_INVOICE',
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT = 'MEX_REQUEST_FOR_PUBLIC_DOCUMENT',
  MEX_TERMINATION_OF_LEASE = 'MEX_TERMINATION_OF_LEASE',
  MEX_TERMINATION_OF_HUNTING_LEASE = 'MEX_TERMINATION_OF_HUNTING_LEASE',
}

export type CaseType = typeof PTCaseType | typeof MEXCaseType;

export const CaseTypes = {
  PT: PTCaseType,
  MEX: MEXCaseType,
  ALL: { ...PTCaseType, ...MEXCaseType },
};
