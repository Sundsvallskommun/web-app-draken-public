// @vitest-environment jsdom
import { getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { JsonParameter } from '@common/data-contracts/supportmanagement/data-contracts';
import type { RJSFSchema } from '@rjsf/utils';
import { cleanup, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { JsonParametersDisplay } from './json-parameters-display.component';

vi.mock('@common/components/json/utils/schema-utils', () => ({
  getRjsfSchema: vi.fn(),
  getUiSchemaForSchema: vi.fn(),
}));
vi.mock('../fields/facility-search-field.componant', () => ({ FacilitySearchField: () => null }));

beforeEach(() => {
  vi.mocked(getRjsfSchema).mockReset();
  vi.mocked(getUiSchemaForSchema).mockReset().mockResolvedValue({});
});
afterEach(cleanup);

test('shows loading before a schema failure and then explains which document could not be displayed', async () => {
  let fail: (error: Error) => void = () => {
    throw new Error('Request not started');
  };
  vi.mocked(getRjsfSchema).mockReturnValue(
    new Promise((_, reject) => {
      fail = reject;
    })
  );
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    render(
      <JsonParametersDisplay
        municipalityId="2281"
        jsonParameters={[{ key: 'Document', schemaId: 'schema-id', value: {} }]}
      />
    );
    expect(screen.getByText('Laddar schema...')).toBeTruthy();
    expect(screen.queryByText(/kunde inte visas/)).toBeNull();
    await act(async () => {
      fail(new Error('Schema unavailable'));
    });
    expect(await screen.findByText(/Uppgifterna för Document kunde inte visas/)).toBeTruthy();
  } finally {
    errorLog.mockRestore();
  }
});

test('displays the saved data read-only when the optional UI schema is unavailable', async () => {
  const schema: RJSFSchema = { type: 'object', properties: { answer: { type: 'string', title: 'Svar' } } };
  // The shared display must still accept the existing Support Management API contract.
  const jsonParameters: JsonParameter[] = [
    { key: 'Document', schemaId: 'schema-id', value: { answer: 'Sparat svar' } },
  ];
  vi.mocked(getRjsfSchema).mockResolvedValue(schema);
  vi.mocked(getUiSchemaForSchema).mockRejectedValue(new Error('No UI schema'));
  render(<JsonParametersDisplay municipalityId="2281" jsonParameters={jsonParameters} />);
  const input = await screen.findByDisplayValue('Sparat svar');
  expect(input.hasAttribute('disabled')).toBe(true);
  expect(screen.queryByRole('button', { name: 'Lägg till' })).toBeNull();
  expect(screen.queryByText(/kunde inte visas/)).toBeNull();
});
