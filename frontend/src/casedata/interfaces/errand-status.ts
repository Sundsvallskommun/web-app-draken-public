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
  UnderBeslut = 'Under Beslut',
  Beslutad = 'Beslutad',
  BeslutVerkstallt = 'Beslut verkställt',
  BeslutOverklagat = 'Beslut överklagat',
  ArendeAvslutat = 'Ärende avslutat',
}

export interface ApiErrandStatus {
  statusType: string;
  description: string;
  dateTime: string;
}
