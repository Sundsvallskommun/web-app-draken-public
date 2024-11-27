import { IsObject, IsString } from 'class-validator';
import { GenericExtraParameters } from './extra-parameters.interface';
import { Note as NoteDTO, NoteType } from '@/data-contracts/case-data/data-contracts';

export class CreateErrandNoteDto implements NoteDTO {
  @IsObject()
  extraParameters: GenericExtraParameters;
  @IsString()
  title: string;
  @IsString()
  text: string;
  @IsString()
  noteType: NoteType;
}