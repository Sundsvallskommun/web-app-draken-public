import { NoteType } from '@/data-contracts/case-data/data-contracts';

export const noteIsTjansteanteckning = (noteType: NoteType): boolean => {
  return noteType === NoteType.PUBLIC;
};
