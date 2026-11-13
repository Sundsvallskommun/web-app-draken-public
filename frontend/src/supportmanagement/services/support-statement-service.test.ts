import { expect, test } from 'vitest';

import type { SupportMetadata } from './support-metadata-service';
import {
  attachmentsOfKind,
  isStatementAttachmentWithoutItsStatement,
  isSupportCommunication,
  isSupportStatementAwaitingAnswer,
  isSupportStatementRemovable,
  isSupportStatementUnsent,
  supportCommunicationFields,
  supportStatementAttachmentIds,
  supportStatementAttachmentPurpose,
  supportStatementEdited,
  supportStatementFields,
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
  label: 'Remiss Polismyndigheten',
  dueAt: '2026-10-22',
  question: '<p>Yttrande begärs.</p>',
  freeText: '',
  responseText: '',
  sentAt: '2026-10-01',
  respondedAt: '',
  status: 'ACTIVE',
  outcome: '',
  ...changes,
});

const COMMUNICATION = { type: 'COMMUNICATION', counterpartyName: 'Krogen Exempel AB' };

const communication = (changes: Partial<SupportStatementForm> = {}): SupportStatementForm =>
  filledIn({
    counterpartyName: 'Krogen Exempel AB',
    label: '',
    question: '',
    freeText: 'Bristerna kvarstår och kommunen överväger en varning.',
    status: 'ACTIVE',
    ...changes,
  });

test('a communication is told from a referral by its type, whatever it is named after', () => {
  expect(isSupportCommunication(COMMUNICATION)).toBe(true);
  expect(isSupportCommunication({ type: 'REFERRAL' })).toBe(false);
  expect(isSupportCommunication({})).toBe(false);
});

test('a communication asks for its text, and for none of what a referral needs', () => {
  expect(supportStatementProblem(communication(), COMMUNICATION, metadata)).toBeUndefined();
  expect(supportStatementProblem(communication({ freeText: '   ' }), COMMUNICATION, metadata)).toBe(
    'common:communications.validation.text'
  );
  // A referral would be stopped here by its missing template and its underlay; a communication has neither.
  expect(supportStatementProblem(communication({ question: '' }), COMMUNICATION, metadata)).toBeUndefined();
});

test('a communication is settled with an outcome, and a responded one says when the answer came', () => {
  expect(supportStatementProblem(communication({ status: 'COMPLETED' }), COMMUNICATION, metadata)).toBe(
    'common:statements.validation.outcome_required'
  );
  expect(
    supportStatementProblem(communication({ outcome: 'SUPPORTS', status: 'ACTIVE' }), COMMUNICATION, metadata)
  ).toBe('common:statements.validation.outcome_needs_completed');
  expect(
    supportStatementProblem(communication({ outcome: 'SUPPORTS', status: 'COMPLETED' }), COMMUNICATION, metadata)
  ).toBe('common:statements.validation.responded_at');
  expect(
    supportStatementProblem(
      communication({ outcome: 'SUPPORTS', status: 'COMPLETED', respondedAt: '2026-11-20' }),
      COMMUNICATION,
      metadata
    )
  ).toBeUndefined();
  // The deadline passed without an answer, so there is no answer to date.
  expect(
    supportStatementProblem(communication({ outcome: 'NO_RESPONSE', status: 'COMPLETED' }), COMMUNICATION, metadata)
  ).toBeUndefined();
});

test('a communication is written with the recipient and title it was created with', () => {
  const fields = supportCommunicationFields(
    communication({ dueAt: '2026-12-01', sentAt: '2026-11-10' }),
    'Krogen Exempel AB',
    'Kommunicering AOT-26110233'
  );

  expect(fields).toMatchObject({
    type: 'COMMUNICATION',
    counterpartyName: 'Krogen Exempel AB',
    title: 'Kommunicering AOT-26110233',
    description: 'Bristerna kvarstår och kommunen överväger en varning.',
    status: 'ACTIVE',
  });
  expect(fields.dueAt).toContain('2026-12-01');
  expect(fields.outcome).toBeUndefined();
  expect(fields).not.toHaveProperty('question');
});

test('a statement without a counterparty cannot be saved', () => {
  expect(supportStatementProblem(filledIn({ counterpartyName: '' }), {}, metadata)).toBe(
    'common:statements.validation.counterparty'
  );
});

test('a statement with no template chosen has nothing to render', () => {
  expect(supportStatementProblem(filledIn({ question: '' }), {}, metadata)).toBe(
    'common:statements.validation.template'
  );
});

const ofItsOwn = (changes: Partial<SupportStatementForm> = {}): SupportStatementForm =>
  filledIn({ counterpartyName: 'Annan instans', question: '', label: 'Yttrande från fastighetsägaren', ...changes });

test('a referral of its own is named rather than templated, since there is no template to choose', () => {
  expect(supportStatementProblem(ofItsOwn(), {}, metadata)).toBeUndefined();
  expect(supportStatementProblem(ofItsOwn({ label: '  ' }), {}, metadata)).toBe(
    'common:statements.validation.document_name'
  );
});

test('a referral of its own is not asked for an underlay nobody generated', () => {
  expect(supportStatementProblem(ofItsOwn({ status: 'ACTIVE' }), {}, metadata)).toBeUndefined();
  expect(supportStatementProblem(filledIn({ status: 'ACTIVE' }), {}, metadata)).toBe(
    'common:statements.validation.underlay_missing'
  );
});

test('the name of a referral of its own is the title it is saved under, whoever saves it', () => {
  const named = { counterpartyName: 'Annan instans', title: 'Yttrande från fastighetsägaren' };

  expect(supportStatementForm(named).label).toBe('Yttrande från fastighetsägaren');

  expect(supportStatementForm({ counterpartyName: 'Annan instans', title: 'Annan instans' }).label).toBe('');
  expect(supportStatementForm({ counterpartyName: 'Skatteverket', title: 'Remiss - Skatteverket - AOT-1' }).label).toBe(
    ''
  );

  // The section saves every referral with a title built after the authority; the name wins over it.
  expect(supportStatementFields(ofItsOwn(), 'Remiss - Annan instans - AOT-26100064').title).toBe(
    'Yttrande från fastighetsägaren'
  );
  expect(supportStatementFields(filledIn(), 'Remiss - Polismyndigheten - AOT-26100064').title).toBe(
    'Remiss - Polismyndigheten - AOT-26100064'
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

test('the free text travels in the description, which Draken asks for nowhere else', () => {
  expect(supportStatementForm({ description: 'Lokalen är nybyggd.' }).freeText).toBe('Lokalen är nybyggd.');
  expect(supportStatementFields(filledIn({ freeText: 'Lokalen är nybyggd.' }), 'Remiss').description).toBe(
    'Lokalen är nybyggd.'
  );
});

test('dates are read from the service as the date field writes them', () => {
  expect(supportStatementForm({ sentAt: '2026-10-01T00:00:00+02:00' }).sentAt).toBe('2026-10-01');
  expect(supportStatementForm({}).sentAt).toBe('');
});

const withUnderlay = {
  attachments: [{ id: 'a1', fileName: 'remiss.pdf', purpose: { name: 'REFERRAL_POLICE_REQUEST' } }],
};

const withUnderlayAndAnswer = {
  attachments: [
    { id: 'a1', fileName: 'remiss.pdf', purpose: { name: 'REFERRAL_POLICE_REQUEST' } },
    { id: 'a2', fileName: 'svar.pdf', purpose: { name: 'REFERRAL_POLICE_RESPONSE' } },
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

test('a document is filed under the authority the statement concerns', () => {
  expect(supportStatementAttachmentPurpose('Polismyndigheten', 'REQUEST')).toBe('REFERRAL_POLICE_REQUEST');
  expect(supportStatementAttachmentPurpose('Kronofogden', 'RESPONSE')).toBe('REFERRAL_ENFORCEMENT_AUTHORITY_RESPONSE');
});

test('an authority without purposes of its own still files its documents somewhere', () => {
  expect(supportStatementAttachmentPurpose('Länsstyrelsen', 'REQUEST')).toBe('STATEMENT_REQUEST');
  expect(supportStatementAttachmentPurpose(undefined, 'RESPONSE')).toBe('STATEMENT_RESPONSE');
});

test('a document keeps its place in the card whichever authority it was filed under', () => {
  const statement = {
    attachments: [
      { id: 'a', purpose: { name: 'REFERRAL_TAX_AGENCY_REQUEST' } },
      { id: 'b', purpose: { name: 'STATEMENT_RESPONSE' } },
      { id: 'c', purpose: { name: 'LEASE_AGREEMENT' } },
      { id: 'd' },
    ],
  };

  expect(attachmentsOfKind(statement, 'REQUEST').map((a) => a.id)).toEqual(['a']);
  expect(attachmentsOfKind(statement, 'RESPONSE').map((a) => a.id)).toEqual(['b']);
});

test('the attachments a referral still owns are collected across every referral on the errand', () => {
  const ids = supportStatementAttachmentIds([
    withUnderlay as never,
    { attachments: [{ id: 'b1' }, { fileName: 'utan id.pdf' }] } as never,
    {} as never,
  ]);

  expect([...ids].sort()).toEqual(['a1', 'b1']);
});

test('an underlay whose referral was removed is flagged, an ordinary attachment is not', () => {
  const linked = supportStatementAttachmentIds([withUnderlay as never]);

  expect(
    isStatementAttachmentWithoutItsStatement({ id: 'a1', purpose: { name: 'REFERRAL_POLICE_REQUEST' } }, linked)
  ).toBe(false);
  expect(
    isStatementAttachmentWithoutItsStatement({ id: 'a9', purpose: { name: 'REFERRAL_POLICE_REQUEST' } }, linked)
  ).toBe(true);
  expect(isStatementAttachmentWithoutItsStatement({ id: 'a9', purpose: { name: 'STATEMENT_RESPONSE' } }, linked)).toBe(
    true
  );
});

test('a file that never belonged to a referral is left alone, whatever it is called', () => {
  const linked = supportStatementAttachmentIds([]);

  expect(isStatementAttachmentWithoutItsStatement({ id: 'c1', purpose: { name: 'FLOOR_PLAN' } }, linked)).toBe(false);
  expect(isStatementAttachmentWithoutItsStatement({ id: 'c2' }, linked)).toBe(false);
  expect(isStatementAttachmentWithoutItsStatement({ id: 'c3', purpose: { name: 'REFERRAL_POLICE' } }, linked)).toBe(
    false
  );
});

test('nothing is flagged before the referrals have been read', () => {
  expect(
    isStatementAttachmentWithoutItsStatement({ id: 'a9', purpose: { name: 'REFERRAL_POLICE_REQUEST' } }, undefined)
  ).toBe(false);
});
