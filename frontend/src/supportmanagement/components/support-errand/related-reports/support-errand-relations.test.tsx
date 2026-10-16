// @vitest-environment jsdom
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { SupportErrandRelations } from './support-errand-relations.component';

const features = vi.hoisted(() => ({ useRelatedReports: false }));
vi.mock('@config/appconfig', () => ({ appConfig: { features } }));
vi.mock('@common/components/linked-errands-disclosure/linked-errands-disclosure.component', () => ({
  LinkedErrandsDisclosure: () => <p>Kopplade ärenden</p>,
}));
vi.mock('./related-reports-disclosure.component', () => ({
  RelatedReportsDisclosure: () => <p>Relaterade rapporter</p>,
}));
vi.mock('@supportmanagement/services/support-errand-service', () => ({ supportErrandIsEmpty: () => false }));

const errand = { id: 'this-report' } as SupportErrand;

afterEach(cleanup);

test('every drake without the related reports keeps Kopplade ärenden as it is', () => {
  features.useRelatedReports = false;
  render(<SupportErrandRelations errand={errand} />);

  expect(screen.getByText('Kopplade ärenden')).toBeTruthy();
  expect(screen.queryByText('Relaterade rapporter')).toBeNull();
});

test('a drake with the related reports shows them in its place', () => {
  features.useRelatedReports = true;
  render(<SupportErrandRelations errand={errand} />);

  expect(screen.getByText('Relaterade rapporter')).toBeTruthy();
  expect(screen.queryByText('Kopplade ärenden')).toBeNull();
});
