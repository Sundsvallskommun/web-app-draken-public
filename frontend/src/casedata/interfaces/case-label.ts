export enum PTCaseLabel {
  PARKING_PERMIT = 'Nytt parkeringstillstånd',
  PARKING_PERMIT_RENEWAL = 'Förnyat parkeringstillstånd',
  LOST_PARKING_PERMIT = 'Borttappat parkeringstillstånd',
  APPEAL = 'Överklagan',
}
export const PTCaseShortLabel: Partial<Record<keyof typeof PTCaseLabel, string>> = {
  PARKING_PERMIT: 'Nytt p-tillstånd',
  PARKING_PERMIT_RENEWAL: 'Förnyelse p-tillstånd',
  LOST_PARKING_PERMIT: 'Borttappat p-tillstånd',
  APPEAL: 'Överklagan p-tillstånd',
};

export enum FTCaseLabel {
  PARATRANSIT = 'Ansökan färdtjänst',
  PARATRANSIT_RENEWAL = 'Ansökan fortsatt färdtjänst',
  PARATRANSIT_CHANGE = 'Ansökan förändring av insatser',
  PARATRANSIT_NATIONAL = 'Ansökan riksfärdtjänst',
  PARATRANSIT_NATIONAL_RENEWAL = 'Ansökan fortsatt riksfärdtjänst',
  PARATRANSIT_RIAK = 'Ansökan RIAK',
  PARATRANSIT_BUS_CARD = 'Ansökan busskort',
  PARATRANSIT_NOTIFICATION = 'Anmälan färdtjänst',
  PARATRANSIT_NOTIFICATION_CHANGE = 'Anmälan förändring av insatser',
  PARATRANSIT_NOTIFICATION_RENEWAL = 'Anmälan fortsatt färdtjänst',
  PARATRANSIT_NOTIFICATION_NATIONAL = 'Anmälan riksfärdtjänst',
  PARATRANSIT_NOTIFICATION_NATIONAL_RENEWAL = 'Anmälan fortsatt riksfärdtjänst',
  PARATRANSIT_NOTIFICATION_RIAK = 'Anmälan RIAK',
  PARATRANSIT_NOTIFICATION_BUS_CARD = 'Anmälan busskort',
}

export const FTCaseShortLabel: Partial<Record<keyof typeof FTCaseLabel, string>> = {
  PARATRANSIT: 'Ansökan färdtjänst',
  PARATRANSIT_RENEWAL: 'Ansökan forts. färdtjänst',
  PARATRANSIT_CHANGE: 'Ansökan ändring insats',
  PARATRANSIT_NATIONAL: 'Ansökan riksfärdtjänst',
  PARATRANSIT_NATIONAL_RENEWAL: 'Ansökan forts. riksfärdtjänst',
  PARATRANSIT_RIAK: 'Ansökan RIAK',
  PARATRANSIT_BUS_CARD: 'Ansökan busskort',

  PARATRANSIT_NOTIFICATION: 'Anmälan färdtjänst',
  PARATRANSIT_NOTIFICATION_CHANGE: 'Anmälan ändring insats',
  PARATRANSIT_NOTIFICATION_RENEWAL: 'Anmälan forts. färdtjänst',
  PARATRANSIT_NOTIFICATION_NATIONAL: 'Anmälan riksfärdtjänst',
  PARATRANSIT_NOTIFICATION_NATIONAL_RENEWAL: 'Anmälan forts. riksfärdtjänst',
  PARATRANSIT_NOTIFICATION_RIAK: 'Anmälan RIAK',
  PARATRANSIT_NOTIFICATION_BUS_CARD: 'Anmälan busskort',
};

export enum MEXCaseLabel {
  'MEX_SQUARE_PLACE' = 'Torgplats',
  'MEX_REQUEST_FOR_PUBLIC_DOCUMENT' = 'Begäran om allmän handling',
  'MEX_INVOICE' = 'Faktura',
  'MEX_LEASE_REQUEST' = 'Arrende/Nyttjanderätt',
  'MEX_LAND_SURVEYING_OFFICE' = 'Lantmäteriförrättning',
  'MEX_LAND_INSTRUCTION' = 'Markanvisning',
  'MEX_UNAUTHORIZED_RESIDENCE' = 'Otillåten bosättning',
  'MEX_PROTECTIVE_HUNTING' = 'Skyddsjakt',
  'MEX_SELL_LAND_TO_THE_MUNICIPALITY' = 'Kommunens inköp av mark',
  'MEX_BUY_LAND_FROM_THE_MUNICIPALITY_PRIVATE' = 'Köpa kommunal mark, privatperson',
  'MEX_BUY_LAND_FROM_THE_MUNICIPALITY_BUSINESS' = 'Köpa kommunal mark, företag',
  'MEX_LAND_RIGHT' = 'Tomträtt',
  'MEX_TERMINATION_OF_LEASE' = 'Arrende/Nyttjanderätt, uppsägning',
  'MEX_HUNTING_LEASE' = 'Jakträtt',
  'MEX_APPLICATION_FOR_ROAD_ALLOWANCE' = 'Vägbidrag',
  'MEX_FORWARDED_FROM_CONTACTSUNDSVALL' = 'Ärende från Kontakt Sundsvall',
  'MEX_OTHER' = 'Övrigt',
  'MEX_BUILDING_PERMIT' = 'Bygglov',
  'MEX_STORMWATER' = 'Dagvatten',
  'MEX_INVASIVE_SPECIES' = 'Invasiva arter',
  'MEX_LAND_USE_AGREEMENT_VALUATION_PROTOCOL' = 'Markupplåtelseavtal/Värderingsprotokoll',
  'MEX_LITTERING' = 'Nedskräpning',
  'MEX_REFERRAL_CONSULTATION' = 'Remiss/Samråd',
  'MEX_PUBLIC_SPACE_LEASE' = 'Upplåtelse av allmän/offentlig plats',
  'MEX_EASEMENT' = 'Servitut',
  'MEX_TREES_FORESTS' = 'Träd, skog',
  'MEX_ROAD_ASSOCIATION' = 'Vägförening/Samfällighetsförening',
  'MEX_RETURNED_TO_CONTACT_SUNDSVALL' = 'Ärende åter till Kontakt Sundsvall',
  'MEX_SMALL_BOAT_HARBOR_DOCK_PORT' = 'Småbåtshamn/Kaj/Hamn',
  'MEX_TRAINING_SEMINAR' = 'Utbildning/seminarium',
  'MEX_LAND_RESERVATION' = 'Markreservation',

  //Legacy
  'MEX_BUY_LAND_FROM_THE_MUNICIPALITY' = 'Köpa kommunal mark',
  'MEX_BUY_SMALL_HOUSE_PLOT' = 'Köpa småhustomt',
  'MEX_REFERRAL_BUILDING_PERMIT_EARLY_DIALOGUE_PLANNING_NOTICE' = 'Remiss/Bygglov/Tidig dialog planbesked',
  'MEX_EARLY_DIALOG_PLAN_NOTIFICATION' = 'Tidig dialog planbesked',
}

export const CaseLabels = {
  PT: PTCaseLabel,
  FT: FTCaseLabel,
  MEX: MEXCaseLabel,
  ALL: { ...PTCaseLabel, ...MEXCaseLabel, ...FTCaseLabel },
};

export const getShortLabel = (caseType: string): string => {
  return (
    PTCaseShortLabel[caseType as keyof typeof PTCaseShortLabel] ??
    FTCaseShortLabel[caseType as keyof typeof FTCaseShortLabel] ??
    CaseLabels.ALL[caseType] ??
    ''
  );
};

export const ALL_LABELS = {
  ...PTCaseLabel,
  ...FTCaseLabel,
  ...MEXCaseLabel,
} as const;

export type AnyCaseType = keyof typeof ALL_LABELS;

const ALL_SHORT_LABELS: Partial<Record<AnyCaseType, string>> = {
  ...PTCaseShortLabel,
  ...FTCaseShortLabel,
} as const;

export const getLabelFromCaseType = (caseType?: string | null): string => {
  if (!caseType) return '';
  return ALL_LABELS[caseType as AnyCaseType] ?? '';
};
