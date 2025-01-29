export enum PTCaseType {
  PARKING_PERMIT = 'PARKING_PERMIT',
  PARKING_PERMIT_RENEWAL = 'PARKING_PERMIT_RENEWAL',
  LOST_PARKING_PERMIT = 'LOST_PARKING_PERMIT',
  APPEAL = 'APPEAL',
}

export enum MEXCaseType {
  MEX_APPLICATION_SQUARE_PLACE = 'MEX_APPLICATION_SQUARE_PLACE',
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT = 'MEX_REQUEST_FOR_PUBLIC_DOCUMENT',
  MEX_INVOICE = 'MEX_INVOICE',
  MEX_LEASE_REQUEST = 'MEX_LEASE_REQUEST',
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY = 'MEX_BUY_LAND_FROM_THE_MUNICIPALITY',
  MEX_BUY_SMALL_HOUSE_PLOT = 'MEX_BUY_SMALL_HOUSE_PLOT',
  MEX_LAND_SURVEYING_OFFICE = 'MEX_LAND_SURVEYING_OFFICE',
  MEX_LAND_INSTRUCTION = 'MEX_LAND_INSTRUCTION',
  MEX_UNAUTHORIZED_RESIDENCE = 'MEX_UNAUTHORIZED_RESIDENCE',
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE = 'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE',
  MEX_PROTECTIVE_HUNTING = 'MEX_PROTECTIVE_HUNTING',
  MEX_SELL_LAND_TO_THE_MUNICIPALITY = 'MEX_SELL_LAND_TO_THE_MUNICIPALITY',
  MEX_EARLY_DIALOG_PLAN_NOTIFICATION = 'MEX_EARLY_DIALOG_PLAN_NOTIFICATION',
  MEX_LAND_RIGHT = 'MEX_LAND_RIGHT',
  MEX_TERMINATION_OF_LEASE = 'MEX_TERMINATION_OF_LEASE',
  MEX_TERMINATION_OF_HUNTING_LEASE = 'MEX_TERMINATION_OF_HUNTING_LEASE',
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE = 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE',
  MEX_FORWARDED_FROM_CONTACTSUNDSVALL = 'MEX_FORWARDED_FROM_CONTACTSUNDSVALL',
  MEX_OTHER = 'MEX_OTHER',
  MEX_BUILDING_PERMIT = 'MEX_BUILDING_PERMIT',
  MEX_STORMWATER = 'MEX_STORMWATER',
  MEX_INVASIVE_SPECIES = 'MEX_INVASIVE_SPECIES',
  MEX_LAND_USE_AGREEMENT_VALUATION_PROTOCOL = 'MEX_LAND_USE_AGREEMENT_VALUATION_PROTOCOL',
  MEX_LITTERING = 'MEX_LITTERING',
  MEX_REFERRAL_CONSULTATION = 'MEX_REFERRAL_CONSULTATION',
  MEX_PUBLIC_SPACE_LEASE = 'MEX_PUBLIC_SPACE_LEASE',
  MEX_EASEMENT = 'MEX_EASEMENT',
  MEX_TREES_FORESTS = 'MEX_TREES_FORESTS',
  MEX_ROAD_ASSOCIATION = 'MEX_ROAD_ASSOCIATION',
  MEX_RETURNED_TO_CONTACT_SUNDSVALL = 'MEX_RETURNED_TO_CONTACT_SUNDSVALL',
  MEX_SMALL_BOAT_HARBOR_DOCK_PORT = 'MEX_SMALL_BOAT_HARBOR_DOCK_PORT',
}

export const CaseType = { ...PTCaseType, ...MEXCaseType };

export const CaseTypes = {
  PT: PTCaseType,
  MEX: MEXCaseType,
  ALL: { ...PTCaseType, ...MEXCaseType },
};
