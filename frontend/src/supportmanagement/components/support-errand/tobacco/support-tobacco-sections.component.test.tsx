// @vitest-environment jsdom
import { useMetadataStore, useSupportStore } from '@stores/index';
import { TOBACCO_SELF_MONITORING_PURPOSES } from '@supportmanagement/services/support-tobacco-application-service';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { type InvestigationSectionProps } from '../investigation-section-text.component';
import { SupportFiledDocumentsSection } from './support-filed-documents-section.component';
import { SupportTobaccoSalesPeriodSection } from './support-tobacco-sales-period-section.component';
import { SupportTobaccoSalesPointSection } from './support-tobacco-sales-point-section.component';

vi.mock('@common/components/dynamic-text-editor', () => ({
  default: ({ value }: { value: { markup?: string } }) => <div data-cy="editor">{value.markup}</div>,
}));
vi.mock('@common/components/use-text-editor-placeholder', () => ({ useTextEditorPlaceholder: () => undefined }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@sk-web-gui/react', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSnackbar: () => vi.fn(),
}));

const SCHEMA = 'aot_tobacco_sales_permit_application';

const errandWith = (answers: Record<string, unknown>) => ({
  id: 'e1',
  status: 'ONGOING',
  labels: [
    { classification: 'CATEGORY', resourceName: 'TOBACCO' },
    { classification: 'TYPE', resourceName: 'SALES_PERMIT_APPLICATION' },
  ],
  stakeholders: [],
  jsonParameters: [{ key: SCHEMA, value: answers, schemaId: `${SCHEMA}-id` }],
});

const saveRef: { current: (() => Promise<boolean>) | undefined } = { current: undefined };

const sectionProps = (sectionKey: string): InvestigationSectionProps =>
  ({
    section: { id: 's1', sectionKey, text: '' },
    investigationId: 'i1',
    writable: true,
    onEdited: vi.fn(),
    onSaved: vi.fn(),
    saveRef,
  } as InvestigationSectionProps);

const fieldOf = (name: string) => document.querySelector(`[data-cy="${name}"]`) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  useMetadataStore.setState({ supportMetadata: { namespace: 'AOT' } as never });
  useSupportStore.setState({ supportErrand: undefined as never, supportAttachments: [] });
});

afterEach(cleanup);

test('the point of sale shows what the application says, and a dash for what it never asked', () => {
  useSupportStore.setState({
    supportErrand: errandWith({
      pointOfSaleName: 'Kiosken i Bergsåker',
      pointOfSaleAddress: { street: 'Bergsåkersvägen 1', postalCode: '85640', city: 'Sundsvall' },
      includesDistanceSelling: 'YES',
      distanceSellingWebsite: 'https://kiosken.se',
    }) as never,
  });

  render(<SupportTobaccoSalesPointSection {...sectionProps('sales_point')} />);

  expect(fieldOf('sales-point-name').textContent).toBe('Kiosken i Bergsåker');
  expect(fieldOf('sales-point-address').textContent).toBe('Bergsåkersvägen 1, 856 40 Sundsvall');
  expect(fieldOf('sales-point-distance-selling').textContent).toBe(
    'common:investigation.answer_yes, https://kiosken.se'
  );
  expect(fieldOf('sales-point-supplier-agreement').textContent).toBe('-');
});

test('the sales period is the dates the applicant gave, or that the permit is asked for indefinitely', () => {
  useSupportStore.setState({
    supportErrand: errandWith({
      salesPeriod: 'TEMPORARY',
      salesPeriodDates: { fromDate: '2026-11-01', toDate: '2027-02-28' },
    }) as never,
  });

  render(<SupportTobaccoSalesPeriodSection {...sectionProps('opening_hours')} />);

  expect(fieldOf('sales-period').textContent).toBe('common:investigation.opening_hours.temporary');
  expect(fieldOf('sales-period-dates').textContent).toBe('2026-11-01 - 2027-02-28');
});

test('a filed document is named by its purpose, and nothing filed is said out loud', () => {
  useSupportStore.setState({
    supportErrand: errandWith({}) as never,
    supportAttachments: [
      { id: 'a1', fileName: 'egenkontroll.pdf', purpose: { name: 'SELF_MONITORING_PROGRAM', displayName: 'Program' } },
    ] as never,
  });

  const { unmount } = render(
    <SupportFiledDocumentsSection
      {...sectionProps('self_monitoring')}
      sectionKey="self_monitoring"
      purposes={TOBACCO_SELF_MONITORING_PURPOSES}
      factKey="common:investigation.self_monitoring.filed"
    />
  );

  expect(fieldOf('filed-documents-self_monitoring-list').textContent).toBe('Program: egenkontroll.pdf');
  unmount();

  useSupportStore.setState({ supportAttachments: [] });

  render(
    <SupportFiledDocumentsSection
      {...sectionProps('self_monitoring')}
      sectionKey="self_monitoring"
      purposes={TOBACCO_SELF_MONITORING_PURPOSES}
      factKey="common:investigation.self_monitoring.filed"
    />
  );

  expect(fieldOf('filed-documents-self_monitoring-none').textContent).toBe('common:investigation.filed_documents_none');
});
