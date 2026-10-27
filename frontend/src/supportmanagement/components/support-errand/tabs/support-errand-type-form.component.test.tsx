// @vitest-environment jsdom
import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';
import {
  getSupportErrandById,
  saveSupportErrandJsonParameters,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  isSupportErrandLocked: () => false,
}));

const SCHEMA_NAME = 'aot_alcohol_serving_permit_application_permanent_serving';
const schema: RJSFSchema = { type: 'object', properties: { answer: { type: 'string', title: 'Svar' } } };

const errand = (overrides: Partial<SupportErrand>): SupportErrand =>
  ({ id: 'errand-id', channel: 'WEB_UI', ...overrides } as unknown as SupportErrand);

const standingIn = (currentActivityId: string) => ({ processStatus: 'WAITING', currentActivityId });
/** What the citizen filed, and the copy of it Katla keeps beside it. */
const filed = { key: SCHEMA_NAME, value: { answer: 'Sparat svar' }, schemaId: 'schema-id-1.0' };
const original = { ...filed, key: `${SCHEMA_NAME}_original` };

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

test('an application filed in an e-service is edited on its own schema version while the errand is under review', async () => {
  const supportErrand = errand({
    channel: 'ESERVICE',
    process: standingIn('review_phase'),
    jsonParameters: [filed, original],
  } as Partial<SupportErrand>);
  vi.mocked(saveSupportErrandJsonParameters).mockResolvedValue(true);
  vi.mocked(getSupportErrandById).mockResolvedValue({ errand: supportErrand } as never);

  render(<SupportErrandTypeForm supportErrand={supportErrand} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  const input = (await screen.findByDisplayValue('Sparat svar')) as HTMLInputElement;
  expect(input.hasAttribute('disabled')).toBe(false);
  expect(vi.mocked(getRjsfSchema).mock.calls[0]).toEqual(['2281', 'schema-id-1.0']);
  expect(vi.mocked(getLatestRjsfSchema)).not.toHaveBeenCalled();

  fireEvent.change(input, { target: { value: 'Ändrat svar' } });
  fireEvent.click(screen.getByRole('button', { name: 'Spara ärendeuppgifter' }));

  // The answers stay on the version they were filed under; the copy Katla keeps goes along untouched.
  await waitFor(() => expect(saveSupportErrandJsonParameters).toHaveBeenCalled());
  expect(vi.mocked(saveSupportErrandJsonParameters).mock.calls[0]).toEqual([
    'errand-id',
    '2281',
    [{ ...filed, value: { answer: 'Ändrat svar' } }, original],
  ]);
});

test('the answers can still be changed during the investigation, and the original shown read-only', async () => {
  const supportErrand = errand({
    channel: 'ESERVICE',
    process: standingIn('investigation_phase'),
    jsonParameters: [{ ...filed, value: { answer: 'Utrett svar' } }, original],
  } as Partial<SupportErrand>);

  render(<SupportErrandTypeForm supportErrand={supportErrand} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  const input = await screen.findByDisplayValue('Utrett svar');
  expect(input.hasAttribute('disabled')).toBe(false);

  fireEvent.click(screen.getByRole('checkbox', { name: 'Visa ursprungliga uppgifter' }));

  const originalInput = await screen.findByDisplayValue('Sparat svar');
  expect(originalInput.hasAttribute('disabled')).toBe(true);
  expect(screen.queryByRole('button', { name: 'Spara ärendeuppgifter' })).toBeNull();
});

test('once the errand has passed the investigation the answers stand as investigated', async () => {
  const supportErrand = errand({
    channel: 'ESERVICE',
    process: standingIn('decision_phase'),
    jsonParameters: [filed, original],
  } as Partial<SupportErrand>);

  render(<SupportErrandTypeForm supportErrand={supportErrand} municipalityId="2281" schemaName={SCHEMA_NAME} />);

  const input = await screen.findByDisplayValue('Sparat svar');
  expect(input.hasAttribute('disabled')).toBe(true);
  expect(screen.queryByRole('button', { name: 'Spara ärendeuppgifter' })).toBeNull();
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
