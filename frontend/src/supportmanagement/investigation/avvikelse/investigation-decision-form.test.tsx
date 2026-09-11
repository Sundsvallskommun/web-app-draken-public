// @vitest-environment jsdom
import Form, { getDefaultRegistry } from '@rjsf/core';
import type { RJSFSchema } from '@rjsf/utils';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { cleanup, fireEvent, isInaccessible, render, screen, waitFor } from '@testing-library/react';
import Ajv2020 from 'ajv/dist/2020';
import { afterEach, expect, test, vi } from 'vitest';

import { ArrayObjectFieldTemplate } from '../../../common/components/json/fields/array-object-field-template.componant';
import { FieldTemplate } from '../../../common/components/json/fields/field-template.componant';
import { SectionsObjectFieldTemplate } from '../../../common/components/json/fields/sections-object-field-template.componant';
import hslSchema from './schemas/beslut-hsl.schema-request.json';
import hslUiSchema from './schemas/beslut-hsl.ui-schema-request.json';
import solLssSchema from './schemas/beslut-sol-lss.schema-request.json';
import solLssUiSchema from './schemas/beslut-sol-lss.ui-schema-request.json';

afterEach(cleanup);

const validator = customizeValidator({ AjvClass: Ajv2020 });
const templates = {
  FieldTemplate,
  ArrayFieldTemplate: ArrayObjectFieldTemplate,
  ObjectFieldTemplate: SectionsObjectFieldTemplate,
};
const defaultWidgets = getDefaultRegistry().widgets;
// The field templates are under test; use RJSF's controls for the application widget names.
const widgets = {
  TextWidget: defaultWidgets.TextWidget,
  TexteditorWidget: defaultWidgets.TextareaWidget,
  RadiobuttonWidget: defaultWidgets.RadioWidget,
};
const savedAt = '2026-09-11T12:30:00.000Z';
const savedRevisions = [{ savedAt, savedBy: 'test-user' }];

for (const decision of [
  { schema: hslSchema, uiSchema: hslUiSchema, answers: {} },
  {
    schema: solLssSchema,
    uiSchema: solLssUiSchema,
    answers: { decidedMisconductDegree: 'no_misconduct', decisionMotivation: 'Bedömt och utrett.' },
  },
]) {
  for (const revisions of [undefined, [], savedRevisions]) {
    test(`${decision.schema.name} hides ${
      revisions === undefined ? 'missing' : revisions.length ? 'saved' : 'empty'
    } revisions and preserves metadata on submit`, async () => {
      const onSubmit = vi.fn();
      const formData = {
        ...decision.answers,
        ivoNotification: 'yes',
        public360CaseNumber: '360-123',
        decidedAt: savedAt,
        updatedAt: savedAt,
        ...(revisions === undefined ? {} : { revisions }),
      };
      render(
        <Form
          schema={decision.schema.value as RJSFSchema}
          uiSchema={decision.uiSchema.value}
          formData={formData}
          validator={validator}
          templates={templates}
          widgets={widgets}
          onSubmit={onSubmit}
        >
          <button type="submit">Spara</button>
        </Form>
      );

      expect(screen.queryByRole('group', { name: 'Sparningar' })).toBeNull();
      expect(isInaccessible(screen.getByText('Sparningar'))).toBe(true);
      expect(isInaccessible(screen.getByText(decision.schema.value.properties.revisions.description))).toBe(true);
      if (!revisions?.length) {
        expect(isInaccessible(screen.getByText('Inga poster har lagts till.'))).toBe(true);
      } else {
        expect(isInaccessible(screen.getByDisplayValue('test-user'))).toBe(true);
      }

      fireEvent.change(screen.getByRole('textbox', { name: 'IVO ärendenummer' }), { target: { value: 'IVO-456' } });
      fireEvent.click(screen.getByRole('button', { name: 'Spara' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
      expect(onSubmit.mock.calls[0][0].formData).toMatchObject({ ...formData, ivoCaseNumber: 'IVO-456' });
    });
  }
}

test('ordinary arrays remain visible and editable', async () => {
  const onSubmit = vi.fn();
  render(
    <Form
      schema={{
        type: 'object',
        properties: { notes: { type: 'array', title: 'Anteckningar', items: { type: 'string' } } },
      }}
      validator={validator}
      templates={templates}
      onSubmit={onSubmit}
    >
      <button type="submit">Spara</button>
    </Form>
  );

  expect(screen.getByRole('group', { name: 'Anteckningar' })).toBeTruthy();
  expect(isInaccessible(screen.getByText('Inga poster har lagts till.'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Lägg till' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'En anteckning' } });
  fireEvent.click(screen.getByRole('button', { name: 'Spara' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
  expect(onSubmit.mock.calls[0][0].formData).toEqual({ notes: ['En anteckning'] });
});
