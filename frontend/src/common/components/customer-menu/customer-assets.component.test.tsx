// @vitest-environment jsdom
import type { Asset } from '@common/interfaces/asset';
import type { CustomerAsset } from '@common/services/customer-service';
import { useConfigStore } from '@stores/index';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import sv from '../../../../public/locales/sv/common.json';
import { CustomerAssets } from './customer-assets.component';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => {
      const found = key
        .replace(/^common:/, '')
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sv);
      return typeof found === 'string' ? found : typeof fallback === 'string' ? fallback : key;
    },
  }),
}));

const assetOf = (changes: Partial<Asset>): CustomerAsset => ({
  asset: { id: 'asset-1', title: 'Stadigvarande serveringstillstånd', ...changes } as Asset,
  registrationNumber: '00000000',
  caseOfficer: 'Anna Handläggare',
  decisionDate: '2026-11-20',
  errandNumber: undefined,
});

const show = (...assets: CustomerAsset[]) =>
  render(<CustomerAssets assets={{ status: 'done', data: assets } as never} />);

beforeEach(() => useConfigStore.setState({ municipalityId: '2281' }));
afterEach(cleanup);

test('a revoked permit stays in the list, named as revoked and not as expired', () => {
  show(assetOf({ status: 'REVOKED', validTo: '2026-11-20' }));

  expect(screen.getByText('Återkallat')).toBeTruthy();
  expect(screen.queryByText('Utgånget')).toBeNull();
  expect(screen.getByText('Stadigvarande serveringstillstånd')).toBeTruthy();
});

test('what the register says was behind the status is shown where it says anything', () => {
  show(assetOf({ status: 'EXPIRED', statusReason: 'Återkallat' }));

  expect(screen.getByText('Utgånget')).toBeTruthy();
  expect(document.querySelector('[data-cy="customer-asset-status-reason"]')?.textContent).toBe('Återkallat');
});

test('a status the register has added since is shown as it stands rather than dropped', () => {
  show(assetOf({ status: 'SOMETHING_NEW' as never }));

  expect(screen.getByText('SOMETHING_NEW')).toBeTruthy();
});
