import assert from 'node:assert/strict';

import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';

import SchemaForm from './schema-form.component';

const render = (placeLabelStructure?: readonly Label[] | null) =>
  renderToStaticMarkup(
    createElement(SchemaForm, {
      schema: { type: 'object', properties: { facility: { type: 'object' } } },
      uiSchema: { facility: { 'ui:field': 'FacilitySearchWidget' } },
      formData: { facility: { orgName: 'Testplats' } },
      placeLabelStructure,
      disabled: true,
    })
  );

test('a facility field distinguishes loading from a missing configured structure', () => {
  assert.match(render(null), /Laddar/);
  assert.doesNotMatch(render(null), /facility-structure-missing/);
  assert.match(render([]), /facility-structure-missing/);
  assert.match(render(), /facility-structure-missing/);
});

test('the schema caller supplies the place structure used to display a saved facility', () => {
  const html = render([
    {
      classification: 'PLACE',
      resourceName: 'platsstruktur',
      labels: [{ classification: 'PLACE', resourceName: 'testplats', displayName: 'Testplats' }],
    },
  ]);
  assert.match(html, /Testplats/);
  assert.doesNotMatch(html, /Laddar|facility-structure-missing/);
});
