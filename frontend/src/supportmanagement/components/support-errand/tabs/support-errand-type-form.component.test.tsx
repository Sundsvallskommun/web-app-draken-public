// @vitest-environment jsdom
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';
import {
  getSupportErrandById,
  saveSupportErrandJsonParameters,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { SupportErrandTypeForm } from './support-errand-type-form.component';

vi.mock('@common/components/json/utils/schema-utils', () => ({
  getLatestRjsfSchema: vi.fn(),
  getRjsfSchema: vi.fn(),
  getUiSchemaForSchema: vi.fn(),
}));
vi.mock('@common/components/json/fields/facility-search-field.componant', () => ({ FacilitySearchField: () => null }));
vi.mock('@supportmanagement/services/support-errand-service', () => ({
  getSupportErrandById: vi.fn(),
  saveSupportErrandJsonParameters: vi.fn(),
  isEserviceErrand: (errand: SupportErrand) => errand.channel === 'ESERVICE',
  isSupportErrandLocked: () => false,
}));

const SCHEMA_NAME = 'aot_alcohol_serving_permit_application_permanent_serving';
const schema: RJSFSchema = { type: 'object', properties: { answer: { type: 'string', title: 'Svar' } } };

const errand = (overrides: Partial<SupportErrand>): SupportErrand =>
  ({ id: 'errand-id', channel: 'WEB_UI', ...overrides } as unknown as SupportErrand);

beforeEach(() => {
  vi.mocked(getLatestRjsfSchema).mockReset().mockResolvedValue({
    schema,
    schemaId: 'schema-id-1.1',
    name: SCHEMA_NAME,
    version: '1.1',
  });
  vi.mocked(getRjsfSchema).mockReset().mockResolvedValue(schema);
  vi.mocked(getUiSchemaForSchema).mockReset().mockResolvedValue({});
  vi.mocked(getSupportErrandById).mockReset();
  vi.mocked(saveSupportErrandJsonParameters).mockReset();
});
afterEach(cleanup);

test('an errand registered in Draken is filled in against the latest schema of its type', async () => {
  render(<SupportErrandTypeForm supportErrand={errand({})} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  expect(await screen.findByRole('button', { name: 'Spara ärendeuppgifter' })).toBeTruthy();
  expect(vi.mocked(getLatestRjsfSchema).mock.calls[0]).toEqual(['2281', SCHEMA_NAME]);
  expect(vi.mocked(getRjsfSchema)).not.toHaveBeenCalled();
});

test('an errand filed in an e-service is shown as filed: its own schema version, read-only', async () => {
  const supportErrand = errand({
    channel: 'ESERVICE',
    jsonParameters: [{ key: SCHEMA_NAME, value: { answer: 'Sparat svar' }, schemaId: 'schema-id-1.0' }],
  });

  render(<SupportErrandTypeForm supportErrand={supportErrand} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  const input = await screen.findByDisplayValue('Sparat svar');
  expect(input.hasAttribute('disabled')).toBe(true);
  expect(screen.queryByRole('button', { name: 'Spara ärendeuppgifter' })).toBeNull();
  expect(vi.mocked(getRjsfSchema).mock.calls[0]).toEqual(['2281', 'schema-id-1.0']);
  expect(vi.mocked(getLatestRjsfSchema)).not.toHaveBeenCalled();
});

test('the first save binds the errand to the loaded version without reloading the form', async () => {
  const { rerender } = render(
    <SupportErrandTypeForm supportErrand={errand({})} municipalityId="2281" schemaName={SCHEMA_NAME} />
  );
  await screen.findByRole('button', { name: 'Spara ärendeuppgifter' });

  const saved = errand({
    jsonParameters: [{ key: SCHEMA_NAME, value: { answer: 'Sparat svar' }, schemaId: 'schema-id-1.1' }],
  });
  rerender(<SupportErrandTypeForm supportErrand={saved} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  expect(screen.queryByText('Laddar schema...')).toBeNull();
  expect(screen.getByRole('button', { name: 'Spara ärendeuppgifter' })).toBeTruthy();
  await screen.findByDisplayValue('Sparat svar');
  expect(vi.mocked(getRjsfSchema)).not.toHaveBeenCalled();
  expect(vi.mocked(getLatestRjsfSchema)).toHaveBeenCalledTimes(1);
});

test('unsaved answers do not follow the errand to a new type', async () => {
  const { rerender } = render(
    <SupportErrandTypeForm supportErrand={errand({})} municipalityId="2281" schemaName={SCHEMA_NAME} />
  );
  const input = (await screen.findByRole('textbox', { name: 'Svar' })) as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'Svar för den gamla typen' } });
  expect(input.value).toBe('Svar för den gamla typen');

  const otherSchemaName = 'aot_alcohol_serving_permit_application_temporary_serving';
  rerender(<SupportErrandTypeForm supportErrand={errand({})} municipalityId="2281" schemaName={otherSchemaName} />);

  const freshInput = (await screen.findByRole('textbox', { name: 'Svar' })) as HTMLInputElement;
  expect(freshInput.value).toBe('');
  expect(vi.mocked(getLatestRjsfSchema).mock.calls[1]).toEqual(['2281', otherSchemaName]);
});

test('an errand type with no published schema says so, not an error', async () => {
  vi.mocked(getLatestRjsfSchema).mockRejectedValue({ response: { status: 404 } });
  render(<SupportErrandTypeForm supportErrand={errand({})} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  expect(await screen.findByText('Ärendetypen har inga ärendeuppgifter att fylla i.')).toBeTruthy();
  expect(screen.queryByText(/kunde inte laddas/)).toBeNull();
  expect(screen.queryByRole('button', { name: 'Spara ärendeuppgifter' })).toBeNull();
});
