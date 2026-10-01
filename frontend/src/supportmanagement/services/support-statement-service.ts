import type {
  ErrandAttachment,
  Statement,
  StatementOutcome,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { base64Decode } from '@common/services/helper-service';
import dayjs from 'dayjs';

import type { SupportMetadata } from './support-metadata-service';
import { supportStatementCounterpartyKey } from './support-statement-counterparties';

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

export const SupportStatementAttachmentKind = {
  REQUEST: 'REQUEST',
  RESPONSE: 'RESPONSE',
} as const;

export type SupportStatementAttachmentKindName =
  (typeof SupportStatementAttachmentKind)[keyof typeof SupportStatementAttachmentKind];

export const supportStatementAttachmentPurpose = (
  counterpartyName: string | undefined,
  kind: SupportStatementAttachmentKindName
): string => {
  const key = supportStatementCounterpartyKey(counterpartyName);
  return key ? `REFERRAL_${key}_${kind}` : `STATEMENT_${kind}`;
};

const kindOfPurpose = (purposeName: string | undefined): SupportStatementAttachmentKindName | undefined => {
  if (purposeName?.endsWith(`_${SupportStatementAttachmentKind.REQUEST}`)) {
    return SupportStatementAttachmentKind.REQUEST;
  }
  if (purposeName?.endsWith(`_${SupportStatementAttachmentKind.RESPONSE}`)) {
    return SupportStatementAttachmentKind.RESPONSE;
  }
  return undefined;
};

export const supportStatementPurposeDisplayName = (
  purposeName: string,
  metadata: SupportMetadata | undefined
): string =>
  (metadata?.attachmentPurposes ?? []).find((purpose) => purpose.name === purposeName)?.displayName ?? purposeName;

export interface SupportStatementForm {
  counterpartyName: string;
  dueAt: string;
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
  dueAt: asDateField(statement.dueAt),
  question: statement.question ?? '',
  responseText: statement.responseText ?? '',
  sentAt: asDateField(statement.sentAt),
  respondedAt: asDateField(statement.respondedAt),
  status: (statement.status as SupportStatementStatusName) ?? SupportStatementStatus.DRAFT,
  outcome: statement.outcome ?? '',
});

export const supportStatementFields = (form: SupportStatementForm, title: string): SupportStatementFields => ({
  counterpartyName: form.counterpartyName,
  dueAt: asTimestamp(form.dueAt),
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

export const isSupportStatementRemovable = (statement: Statement): boolean =>
  attachmentsOfKind(statement, SupportStatementAttachmentKind.RESPONSE).length === 0;

export const isSupportStatementAwaitingAnswer = (statement: Statement): boolean =>
  statement.status === SupportStatementStatus.ACTIVE;

export const isSupportStatementUnsent = (statement: Statement): boolean =>
  !statement.status || statement.status === SupportStatementStatus.DRAFT;

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
    if (attachmentsOfKind(statement, SupportStatementAttachmentKind.REQUEST).length === 0) {
      return 'common:statements.validation.underlay_missing';
    }
    if (!form.sentAt) return 'common:statements.validation.sent_at';
  }

  if (form.status === SupportStatementStatus.COMPLETED) {
    if (!form.outcome) return 'common:statements.validation.outcome_required';
    if (outcomeMeansResponded(form.outcome, metadata)) {
      if (attachmentsOfKind(statement, SupportStatementAttachmentKind.RESPONSE).length === 0) {
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

export const uploadSupportStatementAttachment = (
  errandId: string,
  municipalityId: string,
  statementId: string,
  file: File,
  purpose: string
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

export const selectableSupportStatementOutcomes = (metadata: SupportMetadata | undefined): StatementOutcome[] =>
  [...(metadata?.statementOutcomes ?? [])]
    .filter((outcome) => !outcome.deprecated)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const outcomeMeansResponded = (outcome: string | undefined, metadata: SupportMetadata | undefined): boolean =>
  selectableSupportStatementOutcomes(metadata).find((candidate) => candidate.name === outcome)?.responded === true;

export const attachmentsOfKind = (
  statement: Statement | undefined,
  kind: SupportStatementAttachmentKindName
): ErrandAttachment[] =>
  (statement?.attachments ?? []).filter((attachment) => kindOfPurpose(attachment.purpose?.name) === kind);

export const renderSupportStatementTemplate = (
  identifier: string,
  parameters: Record<string, unknown>
): Promise<string> =>
  apiService
    .post<{ data: { output: string } }, { identifier: string; parameters: Record<string, unknown> }>('render', {
      identifier,
      parameters,
    })
    .then((res) => {
      const rendered = base64Decode(res.data?.data?.output ?? '');
      if (!rendered) {
        console.error('The template rendered nothing', { identifier, answer: res.data });
        throw new Error('The template rendered nothing');
      }
      return rendered;
    })
    .catch((e) => {
      console.error('Something went wrong when rendering the template');
      throw e;
    });

const RENDER_PDF_URL = 'render/direct/pdf';

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
