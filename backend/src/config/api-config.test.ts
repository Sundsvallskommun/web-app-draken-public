import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { apiServiceName } from './api-config';

describe('apiServiceName', () => {
  it('routes the canonical Support Management name through the temporary sprint API', () => {
    assert.equal(apiServiceName('supportmanagement'), 'supportmanagementsprint/14.14');
  });

  it('keeps regular configured and unknown service names unchanged', () => {
    assert.equal(apiServiceName('citizen'), 'citizen/3.0');
    assert.equal(apiServiceName('unknown-service'), 'unknown-service');
  });
});
