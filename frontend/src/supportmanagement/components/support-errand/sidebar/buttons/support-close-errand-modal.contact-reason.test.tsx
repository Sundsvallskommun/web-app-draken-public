// @vitest-environment jsdom
import { useSupportStore } from '@stores/index';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { SupportCloseErrandModal } from './support-close-errand-modal.component';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APPLICATION = 'KC';
  process.env.NEXT_PUBLIC_USE_REASON_FOR_CONTACT = 'true';
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

test('an errand without a contact reason cannot be closed', () => {
  renderModalForErrand({ id: 'errand-id', contactReason: '' });

  expect(screen.getByText(/kan inte avslutas utan orsak till kontakt/)).toBeTruthy();
  expect(screen.queryAllByRole('radio')).toHaveLength(0);
});

test('an errand with a contact reason is offered the resolution codes', () => {
  renderModalForErrand({ id: 'errand-id', contactReason: 'Klagomål' });

  expect(screen.queryByText(/kan inte avslutas utan orsak till kontakt/)).toBeNull();
  expect(screen.getAllByRole('radio').length).toBeGreaterThan(0);
});

test('a handed over errand may still have its resolution confirmed without a contact reason', () => {
  renderModalForErrand({ id: 'errand-id', contactReason: '', resolution: 'PREPARED' }, true);

  expect(screen.queryByText(/kan inte avslutas utan orsak till kontakt/)).toBeNull();
});
