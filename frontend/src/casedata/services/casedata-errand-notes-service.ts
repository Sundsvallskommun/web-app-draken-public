import { CreateErrandNoteDto, ErrandNote } from '@casedata/interfaces/errandNote';
import { noteIsComment, noteIsTjansteanteckning } from '@common/interfaces/note-visibility';
import { ApiResponse, apiService } from '@common/services/api-service';
import { logClientFailure } from '@common/services/client-diagnostics';
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
    logClientFailure('casedata.casedata-errand-notes.saveErrandNote', e);
    throw e;
  });
};

export const deleteErrandNote: (
  municipalityId: string,
  errandId: string,
  noteId: string
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, noteId) => {
  if (!noteId) {
    logClientFailure('casedata.casedata-errand-notes.deleteErrandNote');
  }
  const url = `casedata/${municipalityId}/errands/${errandId}/notes/${noteId}`;
  return apiService.deleteRequest<boolean>(url).catch((e) => {
    logClientFailure('casedata.casedata-errand-notes.deleteErrandNote', e);
    throw e;
  });
};

export const signErrandNote: (
  municipalityId: string,
  errandId: string,
  note: CreateErrandNoteDto
) => Promise<AxiosResponse<boolean>> = (municipalityId, errandId, note) => {
  if (!note || !note.id) {
    logClientFailure('casedata.casedata-errand-notes.signErrandNote');
  }
  if (!note.extraParameters) {
    note.extraParameters = {};
  }
  note.extraParameters['signed'] = 'true';
  const url = `casedata/${municipalityId}/errands/${errandId}/notes/${note.id}`;
  return apiService.patch<boolean, CreateErrandNoteDto>(url, note).catch((e) => {
    logClientFailure('casedata.casedata-errand-notes.signErrandNote', e);
    throw e;
  });
};

export const fetchNote: (
  municipalityId: string,
  errandId: number,
  noteId: string
) => Promise<ApiResponse<ErrandNote>> = (municipalityId, errandId, noteId) => {
  if (!noteId) {
    logClientFailure('casedata.casedata-errand-notes.fetchNote');
  }
  const url = `casedata/${municipalityId}/errands/${errandId}/notes/${noteId}`;
  return apiService
    .get<ApiResponse<ErrandNote>>(url)
    .then((res) => res.data)
    .catch((e) => {
      logClientFailure('casedata.casedata-errand-notes.fetchNote', e);
      throw e;
    });
};

export const getErrandNotes: (notes: ErrandNote[]) => Promise<{ comments: number; serviceNotes: number }> = (notes) => {
  let comments = 0;
  let serviceNotes = 0;

  notes?.forEach((note) => {
    if (noteIsComment(note.noteType)) {
      comments++;
    }
    if (noteIsTjansteanteckning(note.noteType)) {
      serviceNotes++;
    }
  });

  return Promise.resolve({ comments, serviceNotes });
};
