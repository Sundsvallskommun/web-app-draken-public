export enum ErrandStatus {
  ArendeInkommit = 'Ärende inkommit',
  UnderGranskning = 'Under granskning',
  VantarPaKomplettering = 'Väntar på komplettering',
  InterntAterkoppling = 'Internt återkoppling',
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

//List used to prevent activateErrand status loop.
export const pausedStatuses: ErrandStatus[] = [
  ErrandStatus.Parkerad,
  ErrandStatus.InterntAterkoppling,
  ErrandStatus.Tilldelat,
  ErrandStatus.UnderUtredning,
  ErrandStatus.VantarPaKomplettering,
];

export interface ApiErrandStatus {
  statusType?: string;
  description?: string;
  created?: string;
}
