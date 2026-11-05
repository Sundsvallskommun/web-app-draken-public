import { describe, expect, it } from 'vitest';

import {
  buildMessageTemplateBody,
  EMAIL_INFORMATION_TEXT,
  getDefaultMessageBody,
  getDefaultTemplateId,
  getTemplateOptions,
  MessageTemplateInfo,
  MessageTemplates,
  supportsSelectableTemplates,
} from './message-template-body-service';

const template = (identifier: string): MessageTemplateInfo => ({ identifier, name: identifier, content: identifier });

const DEFAULT_ID = 'se.mypages.default';
const PAYMENT_PLAN_ID = 'se.mypages.paymentplan';
const EMAIL_SIGNATURE = '<p>Email signature</p>';
const MY_PAGES_SIGNATURE = '<p>My pages signature</p>';
const HISTORY = '<p>History</p>';

const makeTemplates = (overrides: Partial<MessageTemplates> = {}): MessageTemplates => ({
  internalSignature: '',
  smsTemplate: '',
  smsSignature: '',
  emailSignature: EMAIL_SIGNATURE + EMAIL_INFORMATION_TEXT,
  myPagesSignature: MY_PAGES_SIGNATURE,
  emailTemplates: [template('se.email.default')],
  smsTemplates: [template('se.sms.default')],
  myPagesTemplates: [template(PAYMENT_PLAN_ID), template(DEFAULT_ID)],
  byId: { [DEFAULT_ID]: '<p>Default</p>', [PAYMENT_PLAN_ID]: '<p>Payment plan</p>' },
  app: 'se',
  ...overrides,
});

describe('message-template-body-service', () => {
  describe('getTemplateOptions', () => {
    it('gives the My pages templates to Mina sidor', () => {
      const templates = makeTemplates();

      expect(getTemplateOptions(templates, 'minasidor')).toBe(templates.myPagesTemplates);
    });

    it('keeps the email and sms templates to their own channels', () => {
      const templates = makeTemplates();

      expect(getTemplateOptions(templates, 'email')).toBe(templates.emailTemplates);
      expect(getTemplateOptions(templates, 'sms')).toBe(templates.smsTemplates);
    });

    it('gives no templates to the other channels', () => {
      expect(getTemplateOptions(makeTemplates(), 'webmessage')).toEqual([]);
      expect(getTemplateOptions(makeTemplates(), 'draken')).toEqual([]);
      expect(getTemplateOptions(null, 'minasidor')).toEqual([]);
    });
  });

  describe('supportsSelectableTemplates', () => {
    it('does not open the case data channels up for Mina sidor', () => {
      expect(supportsSelectableTemplates('minasidor')).toBe(false);
    });
  });

  describe('getDefaultTemplateId', () => {
    it('picks the default My pages template', () => {
      expect(getDefaultTemplateId(makeTemplates(), 'minasidor')).toBe(DEFAULT_ID);
    });

    it('is empty when the app has no My pages templates', () => {
      expect(getDefaultTemplateId(makeTemplates({ myPagesTemplates: [] }), 'minasidor')).toBe('');
    });
  });

  describe('buildMessageTemplateBody for Mina sidor', () => {
    it('puts the content before the My pages signature and the history', () => {
      const body = buildMessageTemplateBody({
        templates: makeTemplates(),
        templateId: PAYMENT_PLAN_ID,
        means: 'minasidor',
        history: HISTORY,
      });

      expect(body).toBe(`<p>Payment plan</p>${MY_PAGES_SIGNATURE}${HISTORY}`);
    });

    it('falls back to the email signature without its email information', () => {
      const body = buildMessageTemplateBody({
        templates: makeTemplates({ myPagesSignature: '' }),
        templateId: PAYMENT_PLAN_ID,
        means: 'minasidor',
      });

      expect(body).toBe(`<p>Payment plan</p>${EMAIL_SIGNATURE}`);
    });
  });

  describe('getDefaultMessageBody', () => {
    it('stays as before for an app without My pages templates', () => {
      const templates = makeTemplates({ myPagesSignature: '', myPagesTemplates: [] });

      expect(getDefaultMessageBody(templates, 'minasidor', HISTORY)).toBe(EMAIL_SIGNATURE + HISTORY);
    });
  });
});
