import type {
  ErrandAttachment,
  Statement,
  StatementOutcome,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import dayjs from 'dayjs';

import type { SupportMetadata } from './support-metadata-service';

export const SupportStatementStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type SupportStatementStatusName = (typeof SupportStatementStatus)[keyof typeof SupportStatementStatus];

/** The statuses a handler can set, in the order a statement runs through them. */
export const SUPPORT_STATEMENT_STATUSES: { status: SupportStatementStatusName; translationKey: string }[] = [
  { status: SupportStatementStatus.DRAFT, translationKey: 'common:statements.status.draft' },
  { status: SupportStatementStatus.ACTIVE, translationKey: 'common:statements.status.active' },
  { status: SupportStatementStatus.COMPLETED, translationKey: 'common:statements.status.completed' },
  { status: SupportStatementStatus.CANCELLED, translationKey: 'common:statements.status.cancelled' },
];

/** What an attachment of a statement is for. Both are registered as attachment purposes of the namespace. */
export const SupportStatementPurpose = {
  REQUEST: 'STATEMENT_REQUEST',
  RESPONSE: 'STATEMENT_RESPONSE',
} as const;

export type SupportStatementPurposeName = (typeof SupportStatementPurpose)[keyof typeof SupportStatementPurpose];

/** What the handler fills in for one statement. Dates are held as the date field writes them. */
export interface SupportStatementForm {
  counterpartyName: string;
  question: string;
  responseText: string;
  sentAt: string;
  respondedAt: string;
  status: SupportStatementStatusName;
  outcome: string;
}

const asDateField = (value: string | undefined): string =>
  value && dayjs(value).isValid() ? dayjs(value).format('YYYY-MM-DD') : '';

const asTimestamp = (value: string): string | undefined =>
  value && dayjs(value).isValid() ? dayjs(value).startOf('day').format() : undefined;

export const supportStatementForm = (statement: Statement): SupportStatementForm => ({
  counterpartyName: statement.counterpartyName ?? '',
  question: statement.question ?? '',
  responseText: statement.responseText ?? '',
  sentAt: asDateField(statement.sentAt),
  respondedAt: asDateField(statement.respondedAt),
  status: (statement.status as SupportStatementStatusName) ?? SupportStatementStatus.DRAFT,
  outcome: statement.outcome ?? '',
});

export const supportStatementFields = (form: SupportStatementForm, title: string): SupportStatementFields => ({
  counterpartyName: form.counterpartyName,
  title,
  question: form.question,
  responseText: form.responseText,
  sentAt: asTimestamp(form.sentAt),
  respondedAt: asTimestamp(form.respondedAt),
  status: form.status,
  outcome: form.outcome || undefined,
});

const withoutMarkup = (markup: string): string => markup.replace(/<[^>]*>/g, '').trim();

export const supportStatementEdited = (form: SupportStatementForm, statement: Statement): boolean =>
  JSON.stringify(form) !== JSON.stringify(supportStatementForm(statement));

/** What keeps the underlay from being written at all: without these there is nothing to render. */
export const supportStatementUnderlayProblem = (form: SupportStatementForm): string | undefined => {
  if (!form.counterpartyName) return 'common:statements.validation.counterparty';
  if (!withoutMarkup(form.question)) return 'common:statements.validation.question';
  return undefined;
};

/**
 * A statement the counterparty has answered stays on the errand: the answer is a document of the
 * case, and removing the statement would take it with it.
 */
export const isSupportStatementRemovable = (statement: Statement): boolean =>
  attachmentsForPurpose(statement, SupportStatementPurpose.RESPONSE).length === 0;

/**
 * A statement the errand still waits on. The service keeps the settled states apart from this one by
 * itself: a COMPLETED statement cannot exist without an outcome, and a CANCELLED one cannot be given
 * one at all. Both are therefore settled - including an opposing statement, one with nothing to
 * object to, and one that was never replied to - while an ACTIVE statement is out with a counterparty
 * who has yet to say anything.
 */
export const isSupportStatementAwaitingAnswer = (statement: Statement): boolean =>
  statement.status === SupportStatementStatus.ACTIVE;

/** A statement that was prepared but never sent. Nobody is waiting for it, and nobody has answered. */
export const isSupportStatementUnsent = (statement: Statement): boolean =>
  !statement.status || statement.status === SupportStatementStatus.DRAFT;

/**
 * What keeps the statement from being saved, named by its message. The comment is the one field left
 * optional, and each demand is made where it becomes meaningful: a statement that has been sent has
 * an underlay and a date, and a concluded one carries its outcome. The answer and its date are asked
 * for only when the outcome means that the counterparty answered - an outcome registered as not
 * answered, such as a statement never replied to, has neither. A withdrawn statement is asked for
 * nothing further, since the service lets one be cancelled straight from the draft.
 */
export const supportStatementProblem = (
  form: SupportStatementForm,
  statement: Statement,
  metadata: SupportMetadata | undefined
): string | undefined => {
  const underlay = supportStatementUnderlayProblem(form);
  if (underlay) return underlay;

  if (form.outcome && form.status !== SupportStatementStatus.COMPLETED) {
    return 'common:statements.validation.outcome_needs_completed';
  }

  const wasSent = form.status === SupportStatementStatus.ACTIVE || form.status === SupportStatementStatus.COMPLETED;

  if (wasSent) {
    if (attachmentsForPurpose(statement, SupportStatementPurpose.REQUEST).length === 0) {
      return 'common:statements.validation.underlay_missing';
    }
    if (!form.sentAt) return 'common:statements.validation.sent_at';
  }

  if (form.status === SupportStatementStatus.COMPLETED) {
    if (!form.outcome) return 'common:statements.validation.outcome_required';
    if (outcomeMeansResponded(form.outcome, metadata)) {
      if (attachmentsForPurpose(statement, SupportStatementPurpose.RESPONSE).length === 0) {
        return 'common:statements.validation.response_missing';
      }
      if (!form.respondedAt) return 'common:statements.validation.responded_at';
    }
  }

  return undefined;
};

/** What a statement of this namespace is: a referral to an authority. */
export const SUPPORT_STATEMENT_TYPE = 'REFERRAL';

export interface SupportStatementFields {
  type?: string;
  counterpartyName?: string;
  counterpartyReference?: string;
  title?: string;
  question?: string;
  responseText?: string;
  dueAt?: string;
  sentAt?: string;
  respondedAt?: string;
  outcome?: string;
  status?: SupportStatementStatusName;
}

/** A statement is started as a draft, and the service decides that, so no status is sent with it. */
export type NewSupportStatement = Omit<SupportStatementFields, 'status'>;

const statementsUrl = (errandId: string, municipalityId: string) => `supportstatements/${municipalityId}/${errandId}`;

export const getSupportStatements = (errandId: string, municipalityId: string): Promise<Statement[]> =>
  apiService
    .get<Statement[]>(statementsUrl(errandId, municipalityId))
    .then((res) => res.data ?? [])
    .catch((e) => {
      console.error('Something went wrong when fetching the statements');
      throw e;
    });

export const createSupportStatement = (
  errandId: string,
  municipalityId: string,
  fields: NewSupportStatement
): Promise<Statement> =>
  apiService
    .post<Statement, NewSupportStatement>(statementsUrl(errandId, municipalityId), fields)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when starting the statement');
      throw e;
    });

export const updateSupportStatement = (
  errandId: string,
  municipalityId: string,
  statementId: string,
  fields: SupportStatementFields
): Promise<Statement> =>
  apiService
    .patch<Statement, SupportStatementFields>(`${statementsUrl(errandId, municipalityId)}/${statementId}`, fields)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when saving the statement');
      throw e;
    });

export const deleteSupportStatement = (errandId: string, municipalityId: string, statementId: string): Promise<void> =>
  apiService
    .deleteRequest<void>(`${statementsUrl(errandId, municipalityId)}/${statementId}`)
    .then(() => undefined)
    .catch((e: unknown) => {
      console.error('Something went wrong when removing the statement');
      throw e;
    });

/** Puts the file on the errand, links it to the statement and marks what it is for. */
export const uploadSupportStatementAttachment = (
  errandId: string,
  municipalityId: string,
  statementId: string,
  file: File,
  purpose: SupportStatementPurposeName
): Promise<Statement> => {
  const form = new FormData();
  form.append('files', file);
  form.append('purpose', purpose);

  return apiService
    .post<Statement, FormData>(`${statementsUrl(errandId, municipalityId)}/${statementId}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when uploading the attachment');
      throw e;
    });
};

/** The outcomes the namespace has registered, in the order it gives them. */
export const selectableSupportStatementOutcomes = (metadata: SupportMetadata | undefined): StatementOutcome[] =>
  [...(metadata?.statementOutcomes ?? [])]
    .filter((outcome) => !outcome.deprecated)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

/**
 * Whether the outcome means that the counterparty answered. The service refuses to complete a statement
 * carrying such an outcome without a date of response, so the form asks for one before it is saved.
 */
const outcomeMeansResponded = (outcome: string | undefined, metadata: SupportMetadata | undefined): boolean =>
  selectableSupportStatementOutcomes(metadata).find((candidate) => candidate.name === outcome)?.responded === true;

export const attachmentsForPurpose = (
  statement: Statement | undefined,
  purpose: SupportStatementPurposeName
): ErrandAttachment[] => (statement?.attachments ?? []).filter((attachment) => attachment.purpose?.name === purpose);

const RENDER_PDF_URL = 'render/direct/pdf';

/** Renders what stands in the editor as a PDF, without storing a template for it. */
export const renderSupportStatementPdf = (html: string): Promise<string> =>
  apiService
    .post<{ data: { output: string } }, { content: string; parameters: Record<string, string> }>(RENDER_PDF_URL, {
      content: window.btoa(unescape(encodeURIComponent(html))),
      parameters: {},
    })
    .then((res) => res.data.data.output)
    .catch((e) => {
      console.error('Something went wrong when rendering the statement');
      throw e;
    });

export const pdfFileFromBase64 = (base64: string, filename: string): File => {
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type: 'application/pdf' });
};
