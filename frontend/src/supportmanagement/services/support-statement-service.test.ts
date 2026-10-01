import { expect, test } from 'vitest';

import type { SupportMetadata } from './support-metadata-service';
import {
  isSupportStatementAwaitingAnswer,
  isSupportStatementRemovable,
  isSupportStatementUnsent,
  supportStatementEdited,
  type SupportStatementForm,
  supportStatementForm,
  supportStatementProblem,
} from './support-statement-service';

const metadata = {
  statementOutcomes: [
    { name: 'SUPPORTS', displayName: 'Tillstyrker', sortOrder: 10, responded: true },
    { name: 'NO_RESPONSE', displayName: 'Svar uteblivet', sortOrder: 40, responded: false },
  ],
} as SupportMetadata;

const filledIn = (changes: Partial<SupportStatementForm> = {}): SupportStatementForm => ({
  counterpartyName: 'Polismyndigheten',
  question: '<p>Yttrande begärs.</p>',
  responseText: '',
  sentAt: '2026-10-01',
  respondedAt: '',
  status: 'ACTIVE',
  outcome: '',
  ...changes,
});

test('a statement without a counterparty cannot be saved', () => {
  expect(supportStatementProblem(filledIn({ counterpartyName: '' }), {}, metadata)).toBe(
    'common:statements.validation.counterparty'
  );
});

test('markup without words is an empty statement text', () => {
  expect(supportStatementProblem(filledIn({ question: '<p><br></p>' }), {}, metadata)).toBe(
    'common:statements.validation.question'
  );
});

test('the comment is the one field left optional', () => {
  expect(supportStatementProblem(filledIn({ responseText: '', status: 'DRAFT' }), {}, metadata)).toBeUndefined();
});

test('a form built from a statement is unchanged until something is typed', () => {
  const statement = { counterpartyName: 'Skatteverket', question: '<p>Fråga</p>', status: 'DRAFT' };

  expect(supportStatementEdited(supportStatementForm(statement), statement)).toBe(false);
  expect(supportStatementEdited({ ...supportStatementForm(statement), responseText: 'Svar' }, statement)).toBe(true);
});

test('dates are read from the service as the date field writes them', () => {
  expect(supportStatementForm({ sentAt: '2026-10-01T00:00:00+02:00' }).sentAt).toBe('2026-10-01');
  expect(supportStatementForm({}).sentAt).toBe('');
});

const withUnderlay = {
  attachments: [{ id: 'a1', fileName: 'remiss.pdf', purpose: { name: 'STATEMENT_REQUEST' } }],
};

const withUnderlayAndAnswer = {
  attachments: [
    { id: 'a1', fileName: 'remiss.pdf', purpose: { name: 'STATEMENT_REQUEST' } },
    { id: 'a2', fileName: 'svar.pdf', purpose: { name: 'STATEMENT_RESPONSE' } },
  ],
};

test('a statement is not sent before its underlay has been created', () => {
  expect(supportStatementProblem(filledIn(), {}, metadata)).toBe('common:statements.validation.underlay_missing');
  expect(supportStatementProblem(filledIn({ status: 'DRAFT' }), {}, metadata)).toBeUndefined();
});

test('a sent statement says when it was sent', () => {
  expect(supportStatementProblem(filledIn({ sentAt: '' }), withUnderlay, metadata)).toBe(
    'common:statements.validation.sent_at'
  );
});

test('an answered statement carries the answer, its date and its outcome', () => {
  const answered = filledIn({ status: 'COMPLETED' });

  expect(supportStatementProblem(answered, withUnderlay, metadata)).toBe(
    'common:statements.validation.outcome_required'
  );
  expect(supportStatementProblem({ ...answered, outcome: 'SUPPORTS' }, withUnderlay, metadata)).toBe(
    'common:statements.validation.response_missing'
  );
  expect(supportStatementProblem({ ...answered, outcome: 'SUPPORTS' }, withUnderlayAndAnswer, metadata)).toBe(
    'common:statements.validation.responded_at'
  );
  expect(
    supportStatementProblem(
      { ...answered, outcome: 'SUPPORTS', respondedAt: '2026-10-02' },
      withUnderlayAndAnswer,
      metadata
    )
  ).toBeUndefined();
});

test('a statement nobody answered needs neither an answer nor a date for it', () => {
  expect(
    supportStatementProblem(filledIn({ status: 'COMPLETED', outcome: 'NO_RESPONSE' }), withUnderlay, metadata)
  ).toBeUndefined();
});

test('an outcome belongs to an answered statement, as the service also insists', () => {
  expect(supportStatementProblem(filledIn({ outcome: 'SUPPORTS' }), withUnderlay, metadata)).toBe(
    'common:statements.validation.outcome_needs_completed'
  );
});

test('only a statement still out with a counterparty holds the errand up', () => {
  expect(isSupportStatementAwaitingAnswer({ status: 'ACTIVE' })).toBe(true);
  expect(isSupportStatementAwaitingAnswer({ status: 'COMPLETED' })).toBe(false);
  expect(isSupportStatementAwaitingAnswer({ status: 'CANCELLED' })).toBe(false);
  expect(isSupportStatementAwaitingAnswer({ status: 'DRAFT' })).toBe(false);
});

test('a statement is unsent while it is a draft, or has no status at all', () => {
  expect(isSupportStatementUnsent({ status: 'DRAFT' })).toBe(true);
  expect(isSupportStatementUnsent({})).toBe(true);
  expect(isSupportStatementUnsent({ status: 'ACTIVE' })).toBe(false);
  expect(isSupportStatementUnsent({ status: 'CANCELLED' })).toBe(false);
});

test('a statement whose answer has been uploaded stays on the errand', () => {
  expect(isSupportStatementRemovable({})).toBe(true);
  expect(isSupportStatementRemovable(withUnderlay)).toBe(true);
  expect(isSupportStatementRemovable(withUnderlayAndAnswer)).toBe(false);
});

test('a withdrawn statement is asked for nothing beyond its counterparty and text', () => {
  expect(supportStatementProblem(filledIn({ status: 'CANCELLED', sentAt: '' }), {}, metadata)).toBeUndefined();
  expect(supportStatementProblem(filledIn({ status: 'CANCELLED', outcome: 'SUPPORTS' }), {}, metadata)).toBe(
    'common:statements.validation.outcome_needs_completed'
  );
});
