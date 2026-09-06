export type NoteType = 'PUBLIC' | 'INTERNAL' | 'UNKNOWN';

export const noteIsComment = (noteType: NoteType): boolean => {
  return noteType === 'INTERNAL';
};

export const noteIsTjansteanteckning = (noteType: NoteType): boolean => {
  return noteType === 'PUBLIC';
};
