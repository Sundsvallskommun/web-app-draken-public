import assert from 'node:assert/strict';

import type { RJSFSchema } from '@rjsf/utils';
import { test } from 'vitest';

import {
  changedInvestigationTemplate,
  investigationTextIsReplaceable,
  investigationTextTemplateIdentifier,
  offersInvestigationTextTemplates,
  withInvestigationText,
} from './investigation-text-template';

const templateSchema: RJSFSchema = {
  type: 'object',
  properties: {
    investigationTemplate: { type: 'string', oneOf: [{ const: 'sol_lss', title: 'SOL/LSS utredning' }] },
    investigationText: { type: 'string', contentMediaType: 'text/html' },
  },
};

test('names the Templating API identifier after the template choice, dashed', () => {
  assert.equal(investigationTextTemplateIdentifier('sol_lss'), 'avvikelse.investigation.sol-lss');
  assert.equal(investigationTextTemplateIdentifier('sol_lss_hsl'), 'avvikelse.investigation.sol-lss-hsl');
  assert.equal(investigationTextTemplateIdentifier('hsl'), 'avvikelse.investigation.hsl');
});

test('offers templates only where a template choice can fill a rich-text investigation text', () => {
  assert.equal(offersInvestigationTextTemplates(templateSchema), true);
  assert.equal(
    offersInvestigationTextTemplates({
      ...templateSchema,
      properties: { ...templateSchema.properties, investigationText: { type: 'string' } },
    }),
    false
  );
  assert.equal(
    offersInvestigationTextTemplates({ type: 'object', properties: { investigationText: { type: 'string' } } }),
    false
  );
  assert.equal(offersInvestigationTextTemplates(undefined), false);
});

test('reports a template only when the choice changes to one', () => {
  assert.equal(changedInvestigationTemplate({}, { investigationTemplate: 'sol_lss' }), 'sol_lss');
  assert.equal(
    changedInvestigationTemplate({ investigationTemplate: 'sol_lss' }, { investigationTemplate: 'sol_lss_hsl' }),
    'sol_lss_hsl'
  );
  assert.equal(
    changedInvestigationTemplate({ investigationTemplate: 'sol_lss' }, { investigationTemplate: 'sol_lss' }),
    undefined
  );
  assert.equal(changedInvestigationTemplate({ investigationTemplate: 'sol_lss' }, {}), undefined);
  assert.equal(changedInvestigationTemplate(undefined, { investigationTemplate: 'hsl' }), 'hsl');
});

test('replaces an empty text, including what the editor leaves behind when emptied', () => {
  assert.equal(investigationTextIsReplaceable(undefined, undefined), true);
  assert.equal(investigationTextIsReplaceable('', undefined), true);
  assert.equal(investigationTextIsReplaceable('<p><br></p>', undefined), true);
  assert.equal(investigationTextIsReplaceable('<p>&nbsp; </p>', undefined), true);
});

test('replaces the text an earlier template put there, however the editor reformatted it', () => {
  const inserted = '<h2>Berörda personer</h2><p>[Komplettera]</p><p><br></p>';

  assert.equal(investigationTextIsReplaceable('<h2>Berörda personer</h2>\n<p>[Komplettera]</p>', inserted), true);
  assert.equal(investigationTextIsReplaceable('<h2>Berörda personer</h2><p>Anna och Bo</p>', inserted), false);
  assert.equal(investigationTextIsReplaceable('<p>Egen text</p>', undefined), false);
});

test('writes the text without touching the rest of the document', () => {
  assert.deepEqual(
    withInvestigationText({ investigationTemplate: 'sol_lss', investigationText: 'old' }, '<p>new</p>'),
    {
      investigationTemplate: 'sol_lss',
      investigationText: '<p>new</p>',
    }
  );
});
