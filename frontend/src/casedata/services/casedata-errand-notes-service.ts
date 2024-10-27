import { CreateErrandNoteDto, ErrandNote, NoteType } from '@casedata/interfaces/errandNote';
import { ApiResponse, apiService } from '@common/services/api-service';
import { AxiosResponse } from 'axios';

export const saveErrandNote: (
  municipalityId: string,
  errandId: string,
  note: CreateErrandNoteDto
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, note) => {
  let apiCall;
  if (note.id) {
    const url = `casedata/${municipalityId}/errands/${errandId}/notes/${note.id}`;
    apiCall = apiService.patch<boolean, CreateErrandNoteDto>(url, note);
  } else {
    const url = `casedata/${municipalityId}/errands/${errandId}/notes`;
    apiCall = apiService.patch<boolean, CreateErrandNoteDto>(url, note);
  }
  return apiCall.catch((e) => {
    console.error('Something went wrong when adding/editing note: ', note);
    throw e;
  });
};

export const deleteErrandNote: (
  municipalityId: string,
  errandId: string,
  noteId: string
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, noteId) => {
  if (!noteId) {
    console.error('No note id found, cannot delete. Returning.');
  }
  const url = `casedata/${municipalityId}/errands/${errandId}/notes/${noteId}`;
  return apiService.deleteRequest<boolean>(url).catch((e) => {
    console.error('Something went wrong when deleting note: ', noteId);
    throw e;
  });
};

export const signErrandNote: (
  municipalityId: string,
  errandId: string,
  note: CreateErrandNoteDto
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, note) => {
  if (!note || !note.id) {
    console.error('No note id found, cannot sign. Returning.');
  }
  note.extraParameters['signed'] = 'true';
  const url = `casedata/${municipalityId}/errands/${errandId}/notes/${note.id}`;
  return apiService.patch<boolean, CreateErrandNoteDto>(url, note).catch((e) => {
    console.error('Something went wrong when signing note: ', note.id);
    throw e;
  });
};

export const fetchNote: (municipalityId: string, noteId: string) => Promise<ApiResponse<ErrandNote>> = (
  municipalityId,
  noteId
) => {
  if (!noteId) {
    console.error('No note id found, cannot fetch. Returning.');
  }
  const url = `casedata/${municipalityId}/notes/${noteId}`;
  return apiService
    .get<ApiResponse<ErrandNote>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching note: ', noteId);
      throw e;
    });
};

export const noteIsComment = (noteType: NoteType): boolean => {
  return noteType === 'INTERNAL';
};

export const noteIsTjansteanteckning = (noteType: NoteType): boolean => {
  return noteType === 'PUBLIC';
};
