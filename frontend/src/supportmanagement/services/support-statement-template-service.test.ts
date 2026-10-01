import { expect, test } from 'vitest';

import {
  supportStatementDocumentOf,
  supportStatementDocumentWith,
  supportStatementTemplateParameters,
  supportStatementTemplates,
  supportStatementTextIsUnchanged,
} from './support-statement-template-service';

const RENDERED = [
  '<html><head><style>@page { size: A4 }</style></head>',
  '<body><div class="footer">Sidfot</div><table class="header">Avsändare</table>',
  '<div class="content"><h1>Remiss</h1><p>Yttrande begärs.</p></div>',
  '</body></html>',
].join('');

test('an authority with a template of its own is offered it, and the general one as well', () => {
  expect(supportStatementTemplates('Kronofogden').map((template) => template.identifier)).toEqual([
    'referral-enforcement-authority',
    'referral-general',
  ]);
});

test('an authority without one is offered the general template alone', () => {
  expect(supportStatementTemplates('Miljökontoret').map((template) => template.identifier)).toEqual([
    'referral-general',
  ]);
  expect(supportStatementTemplates(undefined).map((template) => template.identifier)).toEqual(['referral-general']);
});

test('the handler is handed the body of the letter, not the page around it', () => {
  const document = supportStatementDocumentOf(RENDERED);

  expect(document.content).toBe('<h1>Remiss</h1><p>Yttrande begärs.</p>');
  expect(document.frame).toBe(RENDERED);
});

test('what the handler wrote goes back into the frame the template built', () => {
  const document = supportStatementDocumentOf(RENDERED);
  const written = supportStatementDocumentWith(document, '<p>Egen text.</p>');

  expect(written).toContain('@page { size: A4 }');
  expect(written).toContain('<div class="footer">Sidfot</div>');
  expect(written).toContain('<div class="content"><p>Egen text.</p></div>');
  expect(written).not.toContain('Yttrande begärs');
});

test('a document the split does not recognise is still something to write in', () => {
  const document = supportStatementDocumentOf('<p>Bara text</p>');

  expect(document.frame).toBe('');
  expect(document.content).toBe('<p>Bara text</p>');
  expect(supportStatementDocumentWith(document, '<p>Ändrad</p>')).toBe('<p>Ändrad</p>');
});

test('the premises are read from the errand, and the owner stands in when they share an address', () => {
  const owner = {
    role: 'PRIMARY',
    organizationName: 'Krogen Exempel AB',
    externalId: 'd5727c45-8c19-42a0-a04a-5ef11d108618',
    parameters: [{ key: 'organizationNumber', values: ['556676-3081'] }],
    address: 'Storgatan 1',
    zipCode: '852 30',
    city: 'Sundsvall',
  };
  const atTheCompany = {
    errandNumber: 'AOT-26100008',
    stakeholders: [owner],
    jsonParameters: [{ value: { besoksadressSammaSomForetaget: 'JA' } }],
  };
  const ofItsOwn = {
    errandNumber: 'AOT-26100008',
    stakeholders: [owner],
    jsonParameters: [
      {
        value: {
          serveringsstalletsBesoksadress: { gatuadress: 'Kyrkogatan 6', postnummer: '852 31', postort: 'Sundsvall' },
        },
      },
    ],
  };

  const facts = { handlerName: 'Anna Andersson', counterpartyName: 'Kronofogden', dueAt: '2026-10-22' };

  expect(supportStatementTemplateParameters({ ...facts, errand: atTheCompany as never })).toMatchObject({
    premisesStreet: 'Storgatan 1',
    premisesPostalAddress: '852 30 Sundsvall',
    applicantOrgNumber: '556676-3081',
    caseNumber: 'AOT-26100008',
    replyDeadline: '2026-10-22',
  });

  expect(supportStatementTemplateParameters({ ...facts, errand: ofItsOwn as never })).toMatchObject({
    premisesStreet: 'Kyrkogatan 6',
    premisesPostalAddress: '852 31 Sundsvall',
  });
});

test('the premises name is read whether the form wrote it plainly or as a field of its own', () => {
  const owner = { role: 'PRIMARY', organizationName: 'Krogen Exempel AB' };
  const named = (serveringsstalletsNamn: unknown) =>
    supportStatementTemplateParameters({
      errand: { stakeholders: [owner], jsonParameters: [{ value: { serveringsstalletsNamn } }] } as never,
      handlerName: 'Anna Andersson',
      counterpartyName: 'Kronofogden',
      dueAt: '2026-10-22',
    }).premisesName;

  expect(named({ namn: 'Testrestaurangen' })).toBe('Testrestaurangen');
  expect(named('Testrestaurangen')).toBe('Testrestaurangen');
  expect(named(undefined)).toBe('Krogen Exempel AB');
});

test('the premises are the owner’s under either name the question has had', () => {
  const owner = { role: 'PRIMARY', address: 'Storgatan 1', zipCode: '852 30', city: 'Sundsvall' };
  const asked = (question: string) =>
    supportStatementTemplateParameters({
      errand: { stakeholders: [owner], jsonParameters: [{ value: { [question]: 'JA' } }] } as never,
      handlerName: 'Anna Andersson',
      counterpartyName: 'Kronofogden',
      dueAt: '2026-10-22',
    }).premisesStreet;

  expect(asked('besoksadressSammaSomForetaget')).toBe('Storgatan 1');
  expect(asked('besoksadressSammaSomArendeagare')).toBe('Storgatan 1');
});

test('a text the editor rewrote is still the text the template wrote', () => {
  const template = '<h1>Remiss</h1><p>Svar senast 2026-10-22.</p>';
  const rewritten = '<h1>Remiss</h1>\n<p>Svar senast 2026-10-22.</p>&nbsp;';

  expect(supportStatementTextIsUnchanged(rewritten, template)).toBe(true);
  expect(supportStatementTextIsUnchanged('<h1>Remiss</h1><p>Svar senast 2026-11-01.</p>', template)).toBe(false);
  expect(supportStatementTextIsUnchanged(`${template}<p>Eget tillägg.</p>`, template)).toBe(false);
});
