import assert from 'node:assert/strict';

import { test } from 'vitest';

import { buildSupportErrandsCountSearchParameters, buildSupportErrandsSearchParameters } from './support-errand-query';

const labelSelections = [
  { groupKey: 'classification', fieldKey: 'category', resourcePath: 'CATEGORY/HSL/FIRST' },
  { groupKey: 'report', fieldKey: 'report-type', resourcePath: 'REPORT_TYPE/DEVIATION' },
];

test('encodes the label-filter JSON exactly once as one query parameter', () => {
  const query = buildSupportErrandsSearchParameters(
    2,
    12,
    { labelFilter: JSON.stringify(labelSelections) },
    { touched: 'desc' }
  );
  const parameters = new URLSearchParams(query);

  assert.equal(parameters.getAll('labelFilter').length, 1);
  assert.equal(parameters.get('labelFilter'), JSON.stringify(labelSelections));
  assert.equal(parameters.get('page'), '2');
  assert.equal(parameters.get('size'), '12');
  assert.deepEqual(parameters.getAll('sort'), ['touched,desc']);
});

test('preserves raw plus signs and spaces without manual or double encoding', () => {
  const query = buildSupportErrandsSearchParameters(0, 10, { query: 'A+B C' }, { modified: 'desc' });

  assert.match(query, /query=A%2BB\+C/u);
  assert.equal(new URLSearchParams(query).get('query'), 'A+B C');
});

test('uses the same filter encoding for count requests', () => {
  const query = buildSupportErrandsCountSearchParameters({
    labelFilter: JSON.stringify(labelSelections),
    status: 'NEW',
  });
  const parameters = new URLSearchParams(query);

  assert.equal(parameters.get('labelFilter'), JSON.stringify(labelSelections));
  assert.equal(parameters.get('status'), 'NEW');
});
