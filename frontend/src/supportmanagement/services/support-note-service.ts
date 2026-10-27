import { NoteType } from '@casedata/interfaces/errandNote';
import { apiService } from '@common/services/api-service';

interface SupportNoteDto {
  context: string;
  role?: string;
  partyId: string;
  subject: string;
  body: string;
  createdBy: string;
  noteType: NoteType;
}

export interface SupportNote {
  id: string;
  context: string;
  role: string;
  clientId: string;
  partyId: string;
  subject: string;
  body: string;
  caseId: string;
  createdBy: string;
  created: string;
}

export interface SupportNoteData {
  notes: SupportNote[];
  _meta: {
    page: 1;
    limit: 100;
    count: 1;
    totalRecords: 1;
    totalPages: 1;
  };
}

const notesUrl = (errandId: string, municipalityId: string, noteType: NoteType) =>
  `supportnotes/${municipalityId}/${errandId}${noteType === 'PUBLIC' ? '?noteType=PUBLIC' : ''}`;

export const getSupportNotes: (
  errandId: string,
  municipalityId: string,
  noteType?: NoteType
) => Promise<SupportNoteData> = (errandId, municipalityId, noteType = 'INTERNAL') => {
  return apiService
    .get<SupportNoteData>(notesUrl(errandId, municipalityId, noteType))
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notes', e);
      return { notes: [] } as unknown as SupportNoteData;
    });
};

export const getSupportNotesCount: (
  errandId: string,
  municipalityId: string,
  noteType?: NoteType
) => Promise<number> = (errandId, municipalityId, noteType = 'INTERNAL') => {
  return apiService
    .get<SupportNoteData>(notesUrl(errandId, municipalityId, noteType))
    .then((res) => {
      return res.data.notes.length;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notes', e);
      return 0;
    });
};

export const saveSupportNote: (
  errandId: string,
  municipalityId: string,
  body: string,
  partyId?: string,
  noteType?: NoteType
) => Promise<boolean> = (errandId, municipalityId, body, partyId, noteType) => {
  return apiService
    .post<boolean, Partial<SupportNoteDto>>(`supportnotes/${municipalityId}/${errandId}`, { body, partyId, noteType })
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when creating note');
      throw e;
    });
};

export const updateSupportNote: (
  errandId: string,
  municipalityId: string,
  noteId: string,
  body: string
) => Promise<boolean> = (errandId, municipalityId, noteId, body) => {
  return apiService
    .patch<boolean, Partial<SupportNoteDto>>(`supportnotes/${municipalityId}/${errandId}/notes/${noteId}`, { body })
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when Updating note');
      throw e;
    });
};

export const deleteSupportNote: (errandId: string, municipalityId: string, noteId: string) => Promise<boolean> = (
  errandId,
  municipalityId,
  noteId
) => {
  return apiService
    .deleteRequest<boolean>(`supportnotes/${municipalityId}/${errandId}/notes/${noteId}`)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when deleting note');
      throw e;
    });
};
