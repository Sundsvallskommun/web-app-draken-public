import assert from 'node:assert/strict';

import { test } from 'vitest';

import { isProductionBuildPhase, PRODUCTION_BUILD_PHASE } from './build-phase';

test('the production build phase is recognised by the value Next.js sets in NEXT_PHASE', () => {
  assert.equal(isProductionBuildPhase(PRODUCTION_BUILD_PHASE), true);
  assert.equal(isProductionBuildPhase('phase-production-build'), true);
});

test('every other phase, including an unset one, composes the dragon', () => {
  assert.equal(isProductionBuildPhase(undefined), false);
  assert.equal(isProductionBuildPhase(''), false);
  assert.equal(isProductionBuildPhase('phase-development-server'), false);
  assert.equal(isProductionBuildPhase('phase-production-server'), false);
});
