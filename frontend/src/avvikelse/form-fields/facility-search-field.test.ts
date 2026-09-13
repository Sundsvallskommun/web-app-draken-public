import assert from 'node:assert/strict';

import SchemaForm from '@common/components/json/schema/schema-form.component';
import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { isInvestigationTabVisible } from '@supportmanagement/investigation/investigation-module';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';

import { avvikelseInvestigation } from '../avvikelse-investigation';
import { avvikelseSchemaFields } from './facility-search-field.component';

const metadata = vi.hoisted(() => ({ current: undefined as SupportMetadata | undefined }));
vi.mock('@stores/metadata-store', () => ({
  useMetadataStore: (selector: (state: { supportMetadata: SupportMetadata | undefined }) => unknown) =>
    selector({ supportMetadata: metadata.current }),
}));

const render = (placeLabelStructure?: readonly Label[] | null, disabled = true) => {
  metadata.current =
    placeLabelStructure === null
      ? undefined
      : { labels: { labelStructure: placeLabelStructure ? [...placeLabelStructure] : undefined } };
  return renderToStaticMarkup(
    createElement(SchemaForm, {
      schema: { type: 'object', properties: { facility: { type: 'object' } } },
      uiSchema: { facility: { 'ui:field': 'FacilitySearchWidget' } },
      formData: { facility: { orgName: 'Testplats' } },
      fields: avvikelseSchemaFields,
      disabled,
    })
  );
};

test('a facility field distinguishes loading from a missing configured structure', () => {
  assert.match(render(null), /Laddar/);
  assert.doesNotMatch(render(null), /facility-structure-missing/);
  assert.match(render([]), /facility-structure-missing/);
  assert.match(render(), /facility-structure-missing/);
});

test('Avvikelse uses metadata to display a saved facility', () => {
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

test('saved document fields remain available when the investigation tab is disabled', () => {
  assert.equal(isInvestigationTabVisible({ useInvestigation: false }, avvikelseInvestigation), false);
  metadata.current = {
    labels: {
      labelStructure: [
        {
          classification: 'PLACE',
          resourceName: 'platsstruktur',
          labels: [{ classification: 'PLACE', resourceName: 'testplats', displayName: 'Testplats' }],
        },
      ],
    },
  };
  const html = renderToStaticMarkup(
    createElement(SchemaForm, {
      schema: { type: 'object', properties: { facility: { type: 'object' } } },
      uiSchema: { facility: { 'ui:field': 'FacilitySearchWidget' } },
      formData: { facility: { orgName: 'Testplats' } },
      fields: avvikelseInvestigation.schemaFields,
      readonly: true,
    })
  );
  assert.match(html, /Testplats/);
  assert.doesNotMatch(html, /facility-structure-missing|Lägg till plats/);
});
