export enum ErrandStatus {
  ArendeInkommit = 'Ärende inkommit',
  UnderGranskning = 'Under granskning',
  VantarPaKomplettering = 'Väntar på komplettering',
  KompletteringInkommen = 'Komplettering inkommen',
  InterntKomplettering = 'Internt komplettering',
  InterntAterkoppling = 'Internt återkoppling',
  UnderRemiss = 'Under remiss',
  AterkopplingRemiss = 'Återkoppling remiss',
  UnderUtredning = 'Under utredning',
  UnderBeslut = 'Under beslut',
  Beslutad = 'Beslutad',
  BeslutVerkstallt = 'Beslut verkställt',
  BeslutOverklagat = 'Beslut överklagat',
  ArendeAvslutat = 'Ärende avslutat',
  Tilldelat = 'Tilldelat',
  HanterasIAnnatSystem = 'Hanteras i annat system',
  ArendetAvvisas = 'Ärendet avvisas',
  Parkerad = 'Parkerad',
}

export interface ApiErrandStatus {
  statusType: string;
  description: string;
  dateTime: string;
}
