import assert from 'node:assert/strict';

import type { FieldProps, RegistryFieldsType, RJSFSchema } from '@rjsf/utils';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';

import { JsonParametersDisplay } from './json-parameters-display.component';
import SchemaForm from './schema-form.component';

vi.mock('@common/components/json/hooks/useJsonSchema', () => ({
  useJsonSchema: () => ({
    schema,
    uiSchema: { reference: { 'ui:field': 'ReferenceField' } },
    loading: false,
    error: undefined,
  }),
}));

const fields: RegistryFieldsType = {
  ReferenceField: ({ formData, readonly, disabled }: FieldProps<string>) =>
    createElement('output', { 'data-locked': Boolean(readonly || disabled) }, `Referens: ${formData}`),
};
const schema: RJSFSchema = { type: 'object', properties: { reference: { type: 'string', title: 'Referens' } } };

test('a caller supplies its own field for both editing and saved document display', () => {
  for (const readonly of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(SchemaForm, {
        schema,
        uiSchema: { reference: { 'ui:field': 'ReferenceField' } },
        formData: { reference: 'ABC-123' },
        fields,
        readonly,
      })
    );
    assert.match(html, /Referens: ABC-123/);
    assert.match(html, new RegExp(`data-locked="${readonly}"`));
  }
});

test('ordinary forms retain their built-in field and value without business extensions', () => {
  const html = renderToStaticMarkup(createElement(SchemaForm, { schema, formData: { reference: 'ABC-123' } }));
  assert.match(html, /value="ABC-123"/);
  assert.doesNotMatch(html, /Referens: ABC-123|facility-structure-missing/);
});

test('saved JSON parameters use the caller field registry and disable editing', () => {
  const html = renderToStaticMarkup(
    createElement(JsonParametersDisplay, {
      municipalityId: '2281',
      fields,
      jsonParameters: [{ key: 'service-report', schemaId: 'fixture-report', value: { reference: 'ABC-123' } }],
    })
  );
  assert.match(html, /Referens: ABC-123/);
  assert.match(html, /data-locked="true"/);
});
