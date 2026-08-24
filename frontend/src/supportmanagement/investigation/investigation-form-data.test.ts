import assert from 'node:assert/strict';

import type { RJSFSchema } from '@rjsf/utils';
import { test } from 'vitest';

import { normalizeInvestigationFormData } from './investigation-form-data';

test('normalizes nested values through root-level local schema references', () => {
  const schema: RJSFSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      section: { $ref: '#/$defs/section' },
    },
    $defs: {
      section: {
        type: 'object',
        additionalProperties: false,
        properties: {
          retained: { type: 'string' },
        },
      },
    },
  };

  assert.deepEqual(
    normalizeInvestigationFormData('future-schema', schema, {
      section: {
        retained: 'behålls',
        stale: 'tas bort',
      },
    }),
    {
      section: {
        retained: 'behålls',
      },
    }
  );
});
