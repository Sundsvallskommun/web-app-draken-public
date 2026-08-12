import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { buildSupportErrandUpdateBody, SupportErrandDto } from './support-errand.controller';

describe('SupportErrandDto write boundary', () => {
  it('accepts the optimistic locking version returned on existing parameters', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      parameters: [
        {
          key: 'eventType',
          values: ['DEVIATION'],
          version: 1,
        },
        {
          key: 'eventConcerns',
          values: ['PERSON'],
          version: 2,
        },
      ],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });

    assert.deepEqual(validationErrors, []);
  });

  it('omits read-only parameter versions from the Support Management update body', () => {
    const updateBody = buildSupportErrandUpdateBody({
      title: 'Categorized errand',
      parameters: [
        {
          key: 'eventType',
          values: ['DEVIATION'],
          version: 1,
        },
        {
          key: 'eventConcerns',
          values: ['PERSON'],
          version: 2,
        },
      ],
    });

    assert.deepEqual(updateBody, {
      title: 'Categorized errand',
      parameters: [
        { key: 'eventType', values: ['DEVIATION'] },
        { key: 'eventConcerns', values: ['PERSON'] },
      ],
    });
  });

  it('rejects jsonParameters so the generic errand PATCH cannot overwrite document arrays', async () => {
    const payload = plainToInstance(SupportErrandDto, {
      title: 'Allowed errand update',
      jsonParameters: [
        {
          key: 'avvikelse-plats-handelse',
          schemaId: '2281_avvikelse-plats-handelse_1.0',
          value: { description: 'Must stay read-only here' },
        },
      ],
    });

    const validationErrors = await validate(payload, { whitelist: true, forbidNonWhitelisted: true });

    assert.ok(validationErrors.some(error => error.property === 'jsonParameters'));
  });
});
