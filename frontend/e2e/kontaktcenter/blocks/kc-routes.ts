import { mockAdmins } from '../../case-data/fixtures/mockAdmins';
import { mockMe } from '../../case-data/fixtures/mockMe';
import { mockResolvedRelations } from '../../case-data/fixtures/mockRelations';
import { contextOf, mockJson, RouteTarget } from '../../blocks/routes';
import { mockConversationMessages, mockConversations } from '../../lop/fixtures/mockConversations';
import { mockRelations } from '../../lop/fixtures/mockRelations';
import { mockAdressResponse } from '../fixtures/mockAdressResponse';
import { mockMetaData } from '../fixtures/mockMetadata';
import { mockSupportAdminsResponse } from '../fixtures/mockSupportAdmins';
import {
  mockEmptySupportErrand,
  mockSupportAttachments,
  mockSupportErrands,
  mockSupportErrandsEmpty,
  mockSupportMessages,
  mockSupportNotes,
} from '../fixtures/mockSupportErrands';
import { mockNotifications } from '../fixtures/mockSupportNotifications';

/**
 * Route blocks for Kontakt Sundsvall (municipality 2281). Each block mocks the backend calls of
 * one part of the app; a spec combines the blocks it needs. Pass the BrowserContext (page.context())
 * when the app opens new tabs that need the same mocks, or the Page to keep them to one tab.
 */

type SupportErrandMock = { id: string; errandNumber: string };

/** A logged-in KC user: session cookie, user, administrators, feature flags and metadata. */
export const mockKcSession = async (target: RouteTarget): Promise<void> => {
  await contextOf(target).addCookies([{ name: 'connect.sid', value: 'test-session', domain: 'localhost', path: '/' }]);
  await mockJson(target, '**/administrators', mockAdmins, { method: 'GET' });
  await mockJson(target, '**/me', mockMe, { method: 'GET' });
  await mockJson(target, '**/featureflags', [], { method: 'GET' });
  await mockJson(target, '**/users/admins', mockSupportAdminsResponse, { method: 'GET' });
  await mockJson(target, '**/supportmetadata/2281', mockMetaData, { method: 'GET' });
  await mockJson(target, '**/supportnotifications/2281', mockNotifications, { method: 'GET' });
};

/** The overview: the errand list and its paging. */
export const mockKcOverview = async (target: RouteTarget): Promise<void> => {
  await mockJson(target, '**/supporterrands/2281?page=0*', mockSupportErrands, { method: 'GET' });
  await mockJson(target, '**/supporterrands/2281?page=1*', mockSupportErrandsEmpty, { method: 'GET' });
  // The per-status counters in the sidebar.
  await mockJson(
    target,
    '**/countsupporterrands/2281*',
    { count: mockSupportErrands.content.length },
    { method: 'GET' }
  );
};

/** Initiating a new errand, as "Nytt ärende" and an ACE screen pop do. */
export const mockKcNewErrand = async (
  target: RouteTarget,
  errand: SupportErrandMock = mockEmptySupportErrand
): Promise<void> => {
  await mockJson(target, '**/newerrand/2281', errand, { method: 'POST' });
};

/** Everything the errand page loads and saves for the given errand. */
export const mockKcErrandPage = async (
  target: RouteTarget,
  errand: SupportErrandMock = mockEmptySupportErrand
): Promise<void> => {
  await mockJson(target, `**/supporterrands/errandnumber/${errand.errandNumber}`, errand, { method: 'GET' });
  // The page refetches the errand by id after some actions, e.g. viewing an attachment.
  await mockJson(target, `**/supporterrands/2281/${errand.id}`, errand, { method: 'GET' });
  await mockJson(target, `**/supporterrands/2281/${errand.id}`, errand, { method: 'PATCH' });
  await mockJson(target, '**/supportattachments/2281/errands/*/attachments', mockSupportAttachments, { method: 'GET' });
  await mockJson(target, '**/supportattachments/2281/errands/*/attachments/*', mockSupportAttachments[0], {
    method: 'GET',
  });
  await mockJson(target, '**/supportmessage/2281/errands/*/communication', mockSupportMessages, { method: 'GET' });
  await mockJson(target, '**/supportnotes/2281/*', mockSupportNotes, { method: 'GET' });
  await mockJson(target, '**/sourcerelations/**/**', mockRelations, { method: 'GET' });
  await mockJson(target, '**/targetrelations/**/**', mockRelations, { method: 'GET' });
  await mockJson(target, '**/resolvedrelations/**/**', mockResolvedRelations, { method: 'GET' });
  await mockJson(target, '**/communication/conversations/count-read-by*', [], { method: 'GET' });
  await mockJson(target, '**/namespace/errands/**/communication/conversations', mockConversations, { method: 'GET' });
  await mockJson(target, '**/errands/**/communication/conversations/*/messages', mockConversationMessages, {
    method: 'GET',
  });
};

/** Person lookup via the BFF/Citizen (POST /address). Pass a status >= 400 to make it fail. */
export const mockPersonLookup = async (
  target: RouteTarget,
  response: unknown = mockAdressResponse,
  status = 200
): Promise<void> => {
  await mockJson(target, '**/address', response, { method: 'POST', status });
};
