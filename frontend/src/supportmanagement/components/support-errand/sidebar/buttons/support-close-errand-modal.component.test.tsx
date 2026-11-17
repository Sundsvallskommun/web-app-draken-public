// @vitest-environment jsdom
import { appConfig } from '@config/appconfig';
import { useSupportStore } from '@stores/index';
import { Resolution, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SupportCloseErrandModal } from './support-close-errand-modal.component';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APPLICATION = 'SE';
});

vi.mock('@stores/index', () => {
  const selectFrom = (state: object) => (selector: (state: object) => unknown) => selector(state);
  return {
    useConfigStore: selectFrom({ municipalityId: '2281' }),
    useUserStore: selectFrom({ user: { username: 'testuser' }, administrators: [] }),
    useSupportStore: vi.fn(),
  };
});
vi.mock('@stores/ui-settings-store', () => ({ useUiSettingsStore: vi.fn() }));
vi.mock('@supportmanagement/services/support-message-service', () => ({ sendClosingMessage: vi.fn() }));
vi.mock('@supportmanagement/services/support-attachment-service', () => ({ saveSupportAttachments: vi.fn() }));
vi.mock('@supportmanagement/services/support-stakeholder-service', () => ({
  applicantHasContactChannel: () => false,
  getAdminName: () => '',
}));
vi.mock('react-hook-form', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-hook-form')>()),
  useFormContext: () => ({ formState: { dirtyFields: {} } }),
}));

const renderModalForErrand = (errand: Partial<SupportErrand>, afterHandover = false) => {
  vi.mocked(useSupportStore).mockImplementation(((selector: (state: object) => unknown) =>
    selector({ supportErrand: errand, setSupportErrand: vi.fn() })) as typeof useSupportStore);
  render(<SupportCloseErrandModal show onClose={vi.fn()} afterHandover={afterHandover} />);
};

afterEach(cleanup);

test('SE picks from its own resolution codes', () => {
  renderModalForErrand({ id: 'errand-id' });

  const pickerValues = screen.getAllByRole('radio').map((radio) => (radio as HTMLInputElement).value);

  expect(pickerValues.sort()).toEqual(
    [
      Resolution.SOLVED,
      Resolution.SOLVED_FEEDBACK_VIA_PHONE,
      Resolution.SOLVED_FEEDBACK_VIA_FUNCTION_MAILBOX,
      Resolution.CLOSED_MISSING_FEEDBACK,
      Resolution.BACK_TO_CONTACT_SUNDSVALL,
    ].sort()
  );
  expect(screen.getByText('Löst och återkopplat via telefon')).toBeTruthy();
  expect(screen.getByText('Löst och återkopplat via funktionsbrevlåda')).toBeTruthy();
  expect(screen.getByText('Stängt pga saknad återkoppling')).toBeTruthy();
});

test.each([
  [Resolution.SOLVED_FEEDBACK_VIA_PHONE, 'Löst och återkopplat via telefon'],
  [Resolution.SOLVED, 'Löst'],
])('SE names the current code %s', (resolution, label) => {
  renderModalForErrand({ id: 'errand-id', resolution });

  expect(screen.getByText(label)).toBeTruthy();
});

describe('where the contact reason is required', () => {
  const missingReason = /kan inte avslutas utan orsak till kontakt/;

  beforeEach(() => {
    appConfig.features.useReasonForContact = true;
  });
  afterEach(() => {
    appConfig.features.useReasonForContact = false;
  });

  test('an errand without a contact reason cannot be closed', () => {
    renderModalForErrand({ id: 'errand-id', contactReason: '' });

    expect(screen.getByText(missingReason)).toBeTruthy();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  test('an errand with a contact reason is offered the resolution codes', () => {
    renderModalForErrand({ id: 'errand-id', contactReason: 'Klagomål' });

    expect(screen.queryByText(missingReason)).toBeNull();
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
  });

  test('a handed over errand may still have its resolution confirmed without a contact reason', () => {
    renderModalForErrand({ id: 'errand-id', contactReason: '', resolution: Resolution.SOLVED }, true);

    expect(screen.queryByText(missingReason)).toBeNull();
  });
});
