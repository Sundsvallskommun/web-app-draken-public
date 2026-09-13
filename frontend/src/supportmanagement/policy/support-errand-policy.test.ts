import assert from 'node:assert/strict';

import { test } from 'vitest';

import { ongoingStatuses, Resolution, Status } from '../services/support-errand-status';
import { kontaktSundsvallResolutionLabels } from './resolution-label-presets';
import {
  configureSupportErrandPolicy,
  getSupportErrandPolicy,
  kontaktSundsvallSupportErrandPolicy,
  type SupportErrandPolicy,
} from './support-errand-policy';

// Order matters in this file: the first test needs the module in its fresh, unconfigured state, and
// vitest runs a file's tests in declaration order. Keep it first.
test('the policy getter throws until the shell has configured it', () => {
  assert.throws(() => getSupportErrandPolicy(), {
    message: /Support errand policy is not configured.*@shell\/bootstrap/,
  });
});

test('configure then get returns the same object', () => {
  const policy: SupportErrandPolicy = {
    ...kontaktSundsvallSupportErrandPolicy,
    ongoingStatuses: [Status.ONGOING],
  };

  configureSupportErrandPolicy(policy);

  assert.equal(getSupportErrandPolicy(), policy);
});

test('the default policy offers the Kontakt Sundsvall resolution labels', () => {
  assert.equal(kontaktSundsvallSupportErrandPolicy.resolutions, kontaktSundsvallResolutionLabels);
  assert.equal(kontaktSundsvallSupportErrandPolicy.resolutions.REFERRED_TO_RETURN, 'Hänvisat att återkomma');
  assert.equal(kontaktSundsvallSupportErrandPolicy.resolutions[Resolution.SOLVED], 'Löst av Kontakt Sundsvall');
});

test('the default policy treats the ordinary ongoing statuses as open', () => {
  assert.deepEqual(kontaktSundsvallSupportErrandPolicy.ongoingStatuses, ongoingStatuses);
  assert.deepEqual(kontaktSundsvallSupportErrandPolicy.ongoingStatuses, [
    Status.ONGOING,
    Status.PENDING,
    Status.AWAITING_INTERNAL_RESPONSE,
    Status.REOPENED,
  ]);
});

// useClosedAsDefaultResolution is read per call because Adminpanel can flip it after startup.
test('the default resolution is SOLVED, or CLOSED when the capability flag says so', () => {
  assert.equal(
    kontaktSundsvallSupportErrandPolicy.defaultResolution({ useClosedAsDefaultResolution: false }),
    Resolution.SOLVED
  );
  assert.equal(
    kontaktSundsvallSupportErrandPolicy.defaultResolution({ useClosedAsDefaultResolution: true }),
    Resolution.CLOSED
  );
});

// The overview pill has its own compact vocabulary; resolutions outside it defer to metadata.
test('the default solved-status label covers only the resolutions with a pill text of their own', () => {
  assert.equal(
    kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.REGISTERED_EXTERNAL_SYSTEM),
    'Överlämnat'
  );
  assert.equal(kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.CLOSED), 'Avslutat');
  assert.equal(kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.BACK_TO_MANAGER), 'Åter till chef');
  assert.equal(kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.BACK_TO_HR), 'Åter till HR');
  assert.equal(
    kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.BACK_TO_CONTACT_SUNDSVALL),
    'Felskickat'
  );
  assert.equal(kontaktSundsvallSupportErrandPolicy.solvedStatusLabel(Resolution.SOLVED), undefined);
});
