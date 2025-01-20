export enum PTCaseLabel {
  PARKING_PERMIT = 'Nytt parkeringstillstånd',
  PARKING_PERMIT_RENEWAL = 'Förnyat parkeringstillstånd',
  LOST_PARKING_PERMIT = 'Borttappat parkeringstillstånd',
  APPEAL = 'Överklagan',
}

export enum MEXCaseLabel {
  MEX_APPLICATION_SQUARE_PLACE = 'Ansökan torgplats',
  MEX_REQUEST_FOR_PUBLIC_DOCUMENT = 'Begäran om allmän handling',
  MEX_INVOICE = 'Faktura',
  MEX_LEASE_REQUEST = 'Förfrågan arrende',
  MEX_BUY_LAND_FROM_THE_MUNICIPALITY = 'Köpa kommunal mark',
  MEX_BUY_SMALL_HOUSE_PLOT = 'Köpa småhustomt',
  MEX_LAND_SURVEYING_OFFICE = 'Lantmäteriförrättning',
  MEX_LAND_INSTRUCTION = 'Markanvisning',
  MEX_UNAUTHORIZED_RESIDENCE = 'Otillåten bosättning',
  MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOUGE_PLANNING_NOTICE = 'Remiss/Bygglov/Tidig dialog planbesked',
  MEX_PROTECTIVE_HUNTING = 'Skyddsjakt',
  MEX_SELL_LAND_TO_THE_MUNICIPALITY = 'Sälja mark till kommunen',
  MEX_EARLY_DIALOG_PLAN_NOTIFICATION = 'Tidig dialog planbesked',
  MEX_LAND_RIGHT = 'Tomträtt',
  MEX_TERMINATION_OF_LEASE = 'Uppsägning arrende',
  MEX_TERMINATION_OF_HUNTING_LEASE = 'Uppsägning jakträtt',
  MEX_APPLICATION_FOR_ROAD_ALLOWANCE = 'Vägbidrag',
  MEX_FORWARDED_FROM_CONTACTSUNDSVALL = 'Ärende från Kontakt Sundsvall',
  MEX_OTHER = 'Övrigt',
}

export const CaseLabels = {
  PT: PTCaseLabel,
  MEX: MEXCaseLabel,
  ALL: { ...PTCaseLabel, ...MEXCaseLabel },
};
