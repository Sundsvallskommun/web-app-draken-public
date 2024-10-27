import { GenericExtraParameters } from './extra-parameters';

export type NoteType = 'PUBLIC' | 'INTERNAL' | 'UNKNOWN';
export interface ErrandNote {
  id: string;
  created: string;
  updated: string;
  title: string;
  text: string;
  noteType: NoteType;
  createdBy: string;
  updatedBy: string;
  extraParameters?: GenericExtraParameters;
}

export class CreateErrandNoteDto {
  id?: string;
  title: string;
  text: string;
  noteType: NoteType;
  extraParameters?: GenericExtraParameters;
}
