import assert from 'node:assert/strict';

import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { test } from 'vitest';

import { choosesMasMarHandler, readMasMarHandler } from './mas-mar-handler';

test('only MAS/MAR, and an administrator, choose the MAS/MAR handler', () => {
  assert.equal(choosesMasMarHandler({ roleKeys: ['mas-mar'] }), true);
  assert.equal(choosesMasMarHandler({ roleKeys: ['enhetschef', 'mas-mar'] }), true);
  assert.equal(choosesMasMarHandler({ roleKeys: [], superadmin: true }), true);
  assert.equal(choosesMasMarHandler({ roleKeys: ['enhetschef'] }), false);
  assert.equal(choosesMasMarHandler({ roleKeys: ['lex-ansvarig', 'verksamhetschef'] }), false);
  // A deployment that configured no roles names none, and so nobody is MAS/MAR.
  assert.equal(choosesMasMarHandler({}), false);
});

test('reads the recorded MAS/MAR handler from its parameter', () => {
  const errand = (parameters: unknown[]) => ({ parameters } as unknown as SupportErrand);
  assert.equal(readMasMarHandler(errand([{ key: 'masMarHandler', values: ['mas.mar'] }])), 'mas.mar');
  assert.equal(readMasMarHandler(errand([{ key: 'masMarHandler', values: [''] }])), undefined);
  assert.equal(readMasMarHandler(errand([])), undefined);
});
