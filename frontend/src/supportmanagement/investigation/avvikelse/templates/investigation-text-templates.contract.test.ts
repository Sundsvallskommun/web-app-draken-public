import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test } from 'vitest';

import { investigationTextTemplateIdentifier } from '../investigation-text-template';
import managerSchemaRequest from '../schemas/utredning-enhetschef.schema-request.json';
import templateRequests from './investigation-text-templates.json';

const currentDirectory = dirname(fileURLToPath(import.meta.url));

/** What the investigation text editor keeps; anything else would be lost or mangled on insertion. */
const EDITOR_TAGS = new Set(['h2', 'p', 'br', 'strong', 'em']);

const metadataValues = (request: (typeof templateRequests)[number], key: string): string[] =>
  request.metadata.filter((entry) => entry.key === key).map((entry) => entry.value);

const managerTemplateChoices = managerSchemaRequest.value.properties.investigationTemplate.oneOf.map(
  (option) => option.const
);

test('every template answers a template choice of the manager investigation, under its derived identifier', () => {
  for (const request of templateRequests) {
    const [choice] = metadataValues(request, 'investigationTemplate');
    assert.ok(managerTemplateChoices.includes(choice), `${request.identifier} answers no template choice`);
    assert.equal(request.identifier, investigationTextTemplateIdentifier(choice));
    assert.deepEqual(metadataValues(request, 'schemaName'), [managerSchemaRequest.name]);
    assert.equal(request.contentFile, `${request.identifier}.html`);
  }
  assert.equal(new Set(templateRequests.map((request) => request.identifier)).size, templateRequests.length);
});

test('every template is plain editor markup, inserted as it is stored', () => {
  for (const request of templateRequests) {
    const content = readFileSync(join(currentDirectory, request.contentFile), 'utf8').trim();
    const tags = [...content.matchAll(/<\/?([a-z0-9]+)[^>]*>/giu)].map((match) => match[1].toLowerCase());

    assert.ok(content.length > 0, `${request.contentFile} is empty`);
    assert.deepEqual(
      tags.filter((tag) => !EDITOR_TAGS.has(tag)),
      [],
      `${request.contentFile} uses markup the editor drops`
    );
    // The text is read raw, never rendered, so template syntax would show up in the investigation.
    assert.doesNotMatch(content, /\{\{|\{%/u, `${request.contentFile} contains Pebble syntax`);
  }
});
