// @vitest-environment jsdom
import type { RJSFSchema } from '@rjsf/utils';
import { useConfigStore, useMetadataStore, useSupportStore } from '@stores/index';
import type { SupportAttachment } from '@supportmanagement/services/support-attachment-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import type { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SupportErrandRequiredAttachments } from './support-errand-required-attachments.component';

// The schema the errand type is read from; what it declares is decided per test.
const schemaState: { schema: RJSFSchema | null } = { schema: null };
vi.mock('@common/components/json/hooks/useJsonSchemaByName', () => ({
  useJsonSchemaByName: () => ({
    ...schemaState,
    uiSchema: null,
    schemaId: null,
    loading: false,
    error: null,
    notFound: false,
  }),
}));

const METADATA = { namespace: 'AOT' } as SupportMetadata;

const SCHEMA_NAME = 'aot_alcohol_folkol_folkol_serving_notification';

const LABELS = [
  { classification: 'CATEGORY', resourceName: 'ALCOHOL', displayName: 'Alkohol' },
  { classification: 'TYPE', resourceName: 'FOLKOL', displayName: 'Folköl' },
  { classification: 'SUBTYPE', resourceName: 'FOLKOL_SERVING_NOTIFICATION', displayName: 'Servering av folköl' },
];

const SCHEMA: RJSFSchema = {
  type: 'object',
  'x-attachments': [
    {
      key: 'POWER_OF_ATTORNEY',
      label: 'Fullmakt',
      requiredWhen: { properties: { arDuFirmatecknare: { const: 'NEJ' } }, required: ['arDuFirmatecknare'] },
    },
    {
      key: 'SELF_MONITORING_PROGRAM',
      label: 'Egenkontrollprogram',
      requiredWhen: {
        properties: { egenkontrollprogramFolkol: { const: 'JA' } },
        required: ['egenkontrollprogramFolkol'],
      },
    },
    { key: 'FOOD_BUSINESS_REGISTRATION', label: 'Livsmedelsregistrering från miljökontoret' },
  ],
} as RJSFSchema;

const errand = (answers?: Record<string, unknown>): SupportErrand =>
  ({
    labels: LABELS,
    jsonParameters: answers ? [{ key: SCHEMA_NAME, value: answers, schemaId: `${SCHEMA_NAME}-id` }] : [],
  } as unknown as SupportErrand);

const attachment = (purpose: string): SupportAttachment => ({
  id: `attachment-${purpose}`,
  fileName: 'fil.pdf',
  mimeType: 'application/pdf',
  purpose: { id: 'purpose-id', name: purpose },
});

const show = (supportErrand: SupportErrand, attachments?: SupportAttachment[]) => {
  useSupportStore.setState({ supportErrand, supportAttachments: attachments });
  return render(<SupportErrandRequiredAttachments />);
};

const listedKeys = () =>
  [...document.querySelectorAll('[data-cy^="required-attachment-"]')].map((row) =>
    row.getAttribute('data-cy')!.replace('required-attachment-', '')
  );

const missingKeys = () =>
  [...document.querySelectorAll('[data-cy^="required-attachment-"][data-missing="true"]')].map((row) =>
    row.getAttribute('data-cy')!.replace('required-attachment-', '')
  );

const block = () => document.querySelector('[data-cy="required-attachments"]');

beforeEach(() => {
  schemaState.schema = SCHEMA;
  useConfigStore.setState({ municipalityId: '2281' });
  useMetadataStore.setState({ supportMetadata: METADATA });
  useSupportStore.setState({ supportErrand: undefined, supportAttachments: undefined });
});

afterEach(cleanup);

describe('SupportErrandRequiredAttachments', () => {
  test('lists what the answers call for, and says it is missing', () => {
    show(errand({ arDuFirmatecknare: 'NEJ' }));

    expect(listedKeys()).toEqual(['POWER_OF_ATTORNEY']);
    expect(missingKeys()).toEqual(['POWER_OF_ATTORNEY']);
    expect(block()?.textContent).toContain('Fullmakt');
    expect(block()?.textContent).toContain('Saknas');
  });

  test('counts an uploaded attachment with the right purpose as delivered', () => {
    show(errand({ arDuFirmatecknare: 'NEJ' }), [attachment('POWER_OF_ATTORNEY')]);

    expect(listedKeys()).toEqual(['POWER_OF_ATTORNEY']);
    expect(missingKeys()).toEqual([]);
    expect(block()?.textContent).toContain('Inlämnad');
  });

  test('shows nothing while the form is unanswered', () => {
    show(errand());

    expect(block()).toBeNull();
  });

  test('shows nothing when the answers point away from every attachment', () => {
    show(errand({ arDuFirmatecknare: 'JA', egenkontrollprogramFolkol: 'NEJ' }));

    expect(block()).toBeNull();
  });

  test('never lists an attachment the schema declared without a condition', () => {
    show(errand({ arDuFirmatecknare: 'NEJ', egenkontrollprogramFolkol: 'JA' }));

    expect(listedKeys()).toEqual(['POWER_OF_ATTORNEY', 'SELF_MONITORING_PROGRAM']);
  });

  test('shows nothing for an errand type whose schema asks for no attachments', () => {
    schemaState.schema = { type: 'object' };
    show(errand({ arDuFirmatecknare: 'NEJ' }));

    expect(block()).toBeNull();
  });

  test('shows nothing while the schema has not been read', () => {
    schemaState.schema = null;
    show(errand({ arDuFirmatecknare: 'NEJ' }));

    expect(block()).toBeNull();
  });
});
