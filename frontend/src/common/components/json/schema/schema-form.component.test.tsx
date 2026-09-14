// @vitest-environment jsdom
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { ArrayObjectFieldTemplate } from '../fields/array-object-field-template.componant';
import SchemaForm from './schema-form.component';

// These tests exercise the form engine; the place API is covered separately.
vi.mock('../fields/facility-search-field.componant', () => ({ FacilitySearchField: () => null }));

beforeEach(() => {
  // jsdom has no layout or scrolling, but focus remains observable.
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

const answerSchema: RJSFSchema = {
  type: 'object',
  properties: { answer: { type: 'string', title: 'Svar' } },
};

test.each([false, true])(
  'preserves hidden metadata without empty rows or sections (sections: %s)',
  async (sections) => {
    const onSubmit = vi.fn();
    const metadata = { savedBy: 'test-user' };
    const revisions = [{ savedBy: 'earlier-user' }];
    render(
      <SchemaForm
        schema={{
          ...answerSchema,
          properties: {
            ...answerSchema.properties,
            metadata: { type: 'object', properties: { savedBy: { type: 'string' } } },
            revisions: { type: 'array', items: { type: 'object', properties: { savedBy: { type: 'string' } } } },
            timestamp: { type: 'string' },
          },
        }}
        // The application's ui:rows layout extension differs from RJSF's numeric textarea option.
        uiSchema={
          {
            metadata: { 'ui:widget': 'hidden' },
            revisions: { 'ui:widget': 'hidden' },
            timestamp: { 'ui:widget': 'hidden' },
            'ui:rows': [{ fields: ['timestamp', 'answer'] }],
            'ui:options': { showSectionCompletion: false },
            ...(sections
              ? {
                  'ui:sections': [
                    { id: 'metadata', title: 'Dold metadata', fields: ['metadata', 'revisions'] },
                    { id: 'answer', title: 'Synlig sektion', fields: ['timestamp', 'answer'], defaultOpen: true },
                  ],
                }
              : {}),
          } as unknown as UiSchema
        }
        formData={{ metadata, revisions, timestamp: 'saved', answer: 'Bevarat svar' }}
        arrayFieldTemplate={ArrayObjectFieldTemplate}
        onSubmit={onSubmit}
      />
    );
    expect(screen.queryByRole('heading', { name: 'Dold metadata' })).toBeNull();
    expect(screen.queryByDisplayValue('test-user')).toBeNull();
    expect(screen.queryByDisplayValue('earlier-user')).toBeNull();
    expect(document.querySelectorAll('.schema-field-cell')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toEqual({ metadata, revisions, timestamp: 'saved', answer: 'Bevarat svar' });
  }
);

test.each([false, true])(
  'locks fields and hides submit while keeping adjacent actions (extra content: %s)',
  (extra) => {
    render(
      <SchemaForm
        schema={{
          type: 'object',
          properties: {
            answer: { type: 'string', title: 'Svar' },
            choice: { type: 'string', title: 'Val', enum: ['A', 'B'] },
          },
        }}
        formData={{ answer: 'Sparat', choice: 'A' }}
        readonly
        submitButtonOptions={{ label: 'Spara' }}
        submitButtonActions={<button type="button">Visa historik</button>}
        extraContent={extra ? <p>Extra information</p> : undefined}
      />
    );
    expect(screen.getByRole('textbox', { name: 'Svar' }).getAttribute('readonly')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: 'Val' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Spara' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Visa historik' })).toBeTruthy();
  }
);

test('adds and removes array entries while keeping the submitted values', async () => {
  const onSubmit = vi.fn();
  render(
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          people: {
            type: 'array',
            title: 'Deltagare',
            items: {
              type: 'object',
              title: 'Deltagare',
              properties: { name: { type: 'string', title: 'Namn' } },
            },
          },
        },
      }}
      submitButtonOptions={{ label: 'Spara' }}
      onSubmit={onSubmit}
    />
  );
  expect(screen.getByText('Inga poster har lagts till.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Namn' }), { target: { value: 'Anna' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
  fireEvent.change(screen.getAllByRole('textbox', { name: 'Namn' })[1], { target: { value: 'Bertil' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ta bort deltagare 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Spara' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit.mock.calls[0][0]).toEqual({ people: [{ name: 'Bertil' }] });
});

test('submits editable forms with extra content and a configured save button', async () => {
  const onSubmit = vi.fn();
  render(
    <SchemaForm
      schema={answerSchema}
      extraContent={<p>Giltighet</p>}
      submitButtonOptions={{ label: 'Spara insats', leadingIcon: false }}
      onSubmit={onSubmit}
    />
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'Svar' }), { target: { value: 'Ny insats' } });
  fireEvent.click(screen.getByRole('button', { name: 'Spara insats' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit.mock.calls[0][0]).toEqual({ answer: 'Ny insats' });
  expect(screen.getByText('Giltighet')).toBeTruthy();
});

test('displays labels for saved combobox selections in a locked form', () => {
  render(
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          choices: {
            type: 'array',
            title: 'Val',
            uniqueItems: true,
            items: {
              type: 'string',
              oneOf: [
                { const: 'a', title: 'Första' },
                { const: 'b', title: 'Andra' },
              ],
            },
          },
        },
      }}
      formData={{ choices: ['a', 'b'] }}
      readonly
    />
  );
  expect(screen.getByDisplayValue('Första, Andra').hasAttribute('readonly')).toBe(true);
});

test('opens a closed section and focuses the field selected in the error summary', async () => {
  render(
    <SchemaForm
      schema={answerSchema}
      idPrefix="document"
      uiSchema={{ 'ui:sections': [{ id: 'answers', title: 'Uppgifter', fields: ['answer'], defaultOpen: false }] }}
      validationErrors={[{ fieldId: 'document_answer', label: 'Svar', message: 'Vänligen ange Svar.' }]}
    />
  );
  expect(screen.queryByRole('textbox', { name: 'Svar' })).toBeNull();
  fireEvent.click(screen.getByRole('link', { name: 'Svar: Vänligen ange Svar.' }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Svar' })));
});

test('respects conditional choices and renders schema-positioned external fields', () => {
  render(
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          choice: { type: 'string', title: 'Val', enum: ['yes', 'no'] },
          details: { type: 'string', title: 'Beskrivning' },
        },
        allOf: [
          { if: { properties: { choice: { enum: ['yes'] } }, required: ['choice'] }, then: { required: ['details'] } },
        ],
      }}
      uiSchema={{ 'ui:order': ['choice', '$external:classification', 'details'] }}
      externalFields={{ classification: <p>Extern klassificering</p> }}
    />
  );
  expect(screen.queryByRole('textbox', { name: /Beskrivning/ })).toBeNull();
  expect(screen.getByText('Extern klassificering')).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Val' }), { target: { value: 'yes' } });
  expect(screen.getByRole('textbox', { name: /Beskrivning/ })).toBeTruthy();
  fireEvent.change(screen.getByRole('combobox', { name: 'Val' }), { target: { value: 'no' } });
  expect(screen.queryByRole('textbox', { name: /Beskrivning/ })).toBeNull();
});

test('checkbox groups preserve value types and enforce the maximum number of choices', async () => {
  const onSubmit = vi.fn();
  render(
    <SchemaForm
      schema={{
        type: 'object',
        properties: {
          choices: {
            type: 'array',
            title: 'Alternativ',
            uniqueItems: true,
            maxItems: 1,
            items: { type: 'number', enum: [1, 2] },
          },
        },
      }}
      uiSchema={{ choices: { 'ui:widget': 'CheckboxGroupWidget' } }}
      onSubmit={onSubmit}
    />
  );
  fireEvent.click(screen.getByRole('checkbox', { name: '1' }));
  expect(screen.getByRole('checkbox', { name: '2' }).hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit.mock.calls[0][0]).toEqual({ choices: [1] });
});

test.each([
  ['time', '09:15:00'],
  [undefined, '09:15'],
])('normalizes time only when required by the schema (%s)', async (format, expected) => {
  const onSubmit = vi.fn();
  render(
    <SchemaForm
      schema={{ type: 'object', properties: { time: { type: 'string', title: 'Tid', format } } }}
      uiSchema={format ? undefined : { time: { 'ui:widget': 'TimeWidget' } }}
      onSubmit={onSubmit}
    />
  );
  fireEvent.change(screen.getByLabelText('Tid'), { target: { value: '09:15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit.mock.calls[0][0]).toEqual({ time: expected });
});
