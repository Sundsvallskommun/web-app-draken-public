import { Status as IStatusDTO } from '@/data-contracts/case-data/data-contracts';
import { IsString } from 'class-validator';

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
  Tilldelat = 'Tilldelat',
}

export class StatusDTO implements IStatusDTO {
  @IsString()
  statusType: string;
  @IsString()
  description: string;
  @IsString()
  dateTime: string;
}
