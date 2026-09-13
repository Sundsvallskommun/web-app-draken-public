import { IsObject, IsString } from 'class-validator';

import { Note as NoteDTO, NoteType } from '@/data-contracts/case-data/data-contracts';

export class CreateErrandNoteDto implements NoteDTO {
  @IsObject()
  extraParameters!: Record<string, string>;
  @IsString()
  title!: string;
  @IsString()
  text!: string;
  @IsString()
  noteType!: NoteType;
}
