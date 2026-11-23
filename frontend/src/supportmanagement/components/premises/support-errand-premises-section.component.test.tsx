// @vitest-environment jsdom
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandPremisesSection } from './support-errand-premises-section.component';

// The lookup itself has tests of its own; what is under test is whether the section is offered at all.
vi.mock('./premises-section.component', () => ({
  PremisesSection: () => <div data-testid="premises-section" />,
}));

const errandWith = (labels: { classification: string; resourceName: string }[]): SupportErrand =>
  ({ id: 'errand-id', labels } as unknown as SupportErrand);

const INSPECTION = { classification: 'CATEGORY', resourceName: 'INSPECTION' };

beforeEach(() => {
  useConfigStore.setState({ municipalityId: '2281' });
  useMetadataStore.setState({ supportMetadata: { namespace: 'AOT' } as never });
});

afterEach(cleanup);

test('a permit errand is offered its serving places', () => {
  useSupportStore.setState({
    supportErrand: errandWith([{ classification: 'TYPE', resourceName: 'SERVING_PERMIT_APPLICATION' }]),
  });

  render(<SupportErrandPremisesSection />);

  expect(screen.getByTestId('premises-section')).toBeTruthy();
});

test('an action errand is not, since it assigns no restaurant number and keeps no choice', () => {
  useSupportStore.setState({
    supportErrand: errandWith([INSPECTION, { classification: 'TYPE', resourceName: 'MEASURES' }]),
  });

  render(<SupportErrandPremisesSection />);

  expect(screen.queryByTestId('premises-section')).toBeNull();
});
