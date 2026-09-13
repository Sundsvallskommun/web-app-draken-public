import assert from 'node:assert/strict';

import { JsonParametersDisplay } from '@common/components/json/schema/json-parameters-display.component';
import { SchemaFieldsProvider } from '@common/components/json/schema/schema-fields-context';
import SchemaForm from '@common/components/json/schema/schema-form.component';
import { DRAGON_IDS } from '@dragons/dragon-module';
import type { RegistryFieldsType, RJSFSchema } from '@rjsf/utils';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';

import { DRAGON_REGISTRY } from './dragon-registry';

const schema: RJSFSchema = { type: 'object', properties: { facility: { type: 'object' } } };
const uiSchema = { facility: { 'ui:field': 'FacilitySearchWidget' } };
const savedFacility = { orgId: 123, orgName: 'Sparad plats', parentOrgId: 10 };
vi.mock('@common/components/json/hooks/useJsonSchema', () => ({
  useJsonSchema: () => ({ schema, uiSchema, loading: false, error: undefined }),
}));

for (const id of ['IAF', 'VOF'] as const) {
  test(`${id} displays the existing saved facility without enabling editing`, () => {
    const html = renderToStaticMarkup(
      createElement(
        SchemaFieldsProvider,
        {
          value: DRAGON_REGISTRY[id].schemaFields ?? {},
        },
        createElement(JsonParametersDisplay, {
          municipalityId: '2281',
          jsonParameters: [{ key: 'report', schemaId: 'fixture-schema', value: { facility: savedFacility } }],
        })
      )
    );
    assert.match(html, /Sparad plats/);
    assert.doesNotMatch(html, /Lägg till plats|Sök organisation/);
  });
}

test('Avvikelse fields are selected only by IAF and VOF', () => {
  for (const id of DRAGON_IDS) {
    assert.equal(Boolean(DRAGON_REGISTRY[id].schemaFields?.FacilitySearchWidget), id === 'IAF' || id === 'VOF');
  }
});

test('a different application supplies its own JSON field without changing the shared renderer', () => {
  const fields: RegistryFieldsType = { ReferenceField: () => createElement('output', {}, 'Egen referens') };
  const html = renderToStaticMarkup(
    createElement(SchemaForm, {
      schema: { type: 'object', properties: { reference: { type: 'string' } } },
      uiSchema: { reference: { 'ui:field': 'ReferenceField' } },
      fields,
    })
  );
  assert.match(html, /Egen referens/);
  const ordinary = renderToStaticMarkup(
    createElement(SchemaForm, {
      schema: { type: 'object', properties: { reference: { type: 'string' } } },
      formData: { reference: 'ABC-123' },
    })
  );
  assert.match(ordinary, /value="ABC-123"/);
  assert.doesNotMatch(ordinary, /Egen referens|avvikelsen/);
});
