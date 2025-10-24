import { apiService } from '@common/services/api-service';

export interface SupportNoteDto {
  context: string;
  role?: string;
  partyId: string;
  subject: string;
  body: string;
  createdBy: string;
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

export const getSupportNotes: (errandId: string) => Promise<SupportNoteData> = (errandId) => {
  return apiService
    .get<SupportNoteData>(`supportnotes/${errandId}`)
    .then((res) => {
      return res.data;
    })
    .catch((e) => {
      console.error('Something went wrong when fetching notes');
      return { notes: [] } as SupportNoteData;
    });
};

export const saveSupportNote: (errandId: string, body: string, partyId?: string) => Promise<boolean> = (
  errandId,
  body,
  partyId
) => {
  return apiService
    .post<boolean, Partial<SupportNoteDto>>(`supportnotes/${errandId}`, { body, partyId })
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when creating note');
      throw e;
    });
};

export const updateSupportNote: (errandId: string, noteId: string, body: string) => Promise<boolean> = (
  errandId,
  noteId,
  body
) => {
  return apiService
    .patch<boolean, Partial<SupportNoteDto>>(`supportnotes/${errandId}/notes/${noteId}`, { body })
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when Updating note');
      throw e;
    });
};

export const deleteSupportNote: (errandId: string, noteId: string) => Promise<boolean> = (errandId, noteId) => {
  return apiService
    .deleteRequest<boolean>(`supportnotes/${errandId}/notes/${noteId}`)
    .then((res) => {
      return true;
    })
    .catch((e) => {
      console.error('Something went wrong when deleting note');
      throw e;
    });
};
