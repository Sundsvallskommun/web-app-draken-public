import assert from 'node:assert/strict';

import { test } from 'vitest';

import { initialRegistrationLocationId, registrationLocationIsFixed } from './support-errand-registration-location';

const place = (labelId: string) => ({ labelId, displayName: labelId, resourcePath: `LOCATION/${labelId}` });
const options = (locationSource: 'employment' | 'access' | undefined, ...labelIds: string[]) => ({
  reportTypes: [],
  priorities: [],
  locations: labelIds.map(place),
  ...(locationSource ? { locationSource } : {}),
});

test('starts at the main employment, and asks nothing when there is only that one place', () => {
  assert.equal(initialRegistrationLocationId(options('employment', 'main', 'second')), 'main');
  assert.equal(registrationLocationIsFixed(options('employment', 'main')), true);
  assert.equal(registrationLocationIsFixed(options('employment', 'main', 'second')), false);
});

test('leaves a configured place for the handler to choose', () => {
  assert.equal(initialRegistrationLocationId(options('access', 'unit')), '');
  assert.equal(initialRegistrationLocationId(options(undefined, 'unit')), '');
  assert.equal(registrationLocationIsFixed(options('access', 'unit')), false);
  assert.equal(initialRegistrationLocationId(options('employment')), '');
});
