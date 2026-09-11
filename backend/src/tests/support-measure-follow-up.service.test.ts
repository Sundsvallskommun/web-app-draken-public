import type { Measure } from '@/data-contracts/supportmanagement/data-contracts';
import { HttpException } from '@/exceptions/HttpException';
import schemaRequest from '@/schemas/measure-follow-up.schema-request.json';
import ApiService, { type ApiRequestConfig, type ApiResponse } from '@/services/api.service';
import type { SupportJsonParameter } from '@/services/support-json-parameter.service';
import { SupportMeasureService } from '@/services/support-measure.service';

import { mockUser } from './helpers/http';

const user = mockUser();
const answers = { desiredEffectAchieved: false, followUpDescription: 'Ingen förbättring ännu.' };
const schema = { ...schemaRequest, id: '2281_measure-follow-up_1.0' };

/** Simulates SM 16.1 persistence, including writes that succeed but lose their response. */
class MeasureApi extends ApiService {
  measure: Measure = {
    id: 'measure-1',
    version: 3,
    addedByUser: user.username,
    accept: 'TRUE',
    plannedStart: '2026-09-08T12:00:00Z',
    goal: 'Originalmål',
  };
  document?: SupportJsonParameter;
  parent = { version: 7, status: 'ONGOING' };
  failure?: 'put-before' | 'put-after' | 'patch-before' | 'patch-after' | 'stale' | 'denied' | 'schema';
  patches: unknown[] = [];
  puts = 0;

  private response<T>(data: unknown, status = 200, version?: number): ApiResponse<T> {
    return { data: structuredClone(data) as T, message: 'success', status, headers: version === undefined ? {} : { etag: `"${version}"` } };
  }

  override async get<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const url = config.url ?? '';
    if (url.includes('/schemas/')) {
      if (this.failure === 'schema') throw new HttpException(404, 'Missing schema');
      return this.response(schema);
    }
    if (url.includes('/json-parameters/')) {
      if (this.failure === 'denied') throw new HttpException(403, 'Denied');
      if (!this.document) throw new HttpException(404, 'Not found');
      return this.response(this.document, 200, 0);
    }
    if (url.endsWith('/metadata')) return this.response({ measureTypes: [], roles: [] });
    if (url.endsWith('/measures')) return this.response([this.measure]);
    if (url.endsWith('/measures/measure-1')) return this.response(this.measure);
    return this.response(this.parent, 200, this.parent.version);
  }

  override async put<T, D>(config: ApiRequestConfig<D>): Promise<ApiResponse<T>> {
    this.puts++;
    expect(config.headers).toEqual({ 'If-Match': '"-1"' });
    if (this.failure === 'put-before') throw new HttpException(503, 'Unavailable');
    if (this.document) throw new HttpException(412, 'Already exists');
    this.document = { ...(config.data as SupportJsonParameter), version: 0 };
    this.parent.version++;
    if (this.failure === 'stale') this.measure.version = 4;
    if (this.failure === 'put-after') throw new HttpException(503, 'Lost response');
    return this.response(this.document, 201, 0);
  }

  override async patch<T, D>(config: ApiRequestConfig<D>): Promise<ApiResponse<T>> {
    expect(config.url).toMatch(/\/measures\/measure-1$/);
    expect(this.document).toBeDefined();
    expect(config.data).toEqual({ executed: this.document?.value.executed });
    expect(config.headers).toEqual({ 'If-Match': `"${this.measure.version}"` });
    this.patches.push(config.data);
    if (this.failure === 'patch-before') throw new HttpException(503, 'Unavailable');
    this.measure = { ...this.measure, ...(config.data as Pick<Measure, 'executed'>), version: (this.measure.version ?? 0) + 1 };
    this.parent.version++;
    if (this.failure === 'patch-after') throw new HttpException(503, 'Lost response');
    return this.response(this.measure);
  }
}

function setup() {
  const api = new MeasureApi();
  const service = new SupportMeasureService(api, '');
  return {
    api,
    service,
    save: (version = 3, value = answers) => service.followUp('2281', 'errand-1', 'measure-1', `"${version}"`, value, user),
    read: () => service.read('2281', 'errand-1', user),
  };
}

test.each(['TRUE', 'REWORK'] as const)('persists a negative answer for %s through existing SM resources', async accept => {
  const { api, save, read } = setup();
  api.measure.accept = accept;
  await save();
  expect(api.document?.value).toMatchObject({ ...answers, measureId: 'measure-1', measureVersion: 3, recordedBy: user.username });
  expect((await read()).measures[0]).toMatchObject({
    goal: 'Originalmål',
    plannedStart: api.measure.plannedStart,
    followUp: { status: 'completed', ...answers },
  });
  expect(api.puts).toBe(1);
  expect(api.patches).toHaveLength(1);
});

test('preserves an already recorded execution date', async () => {
  const { api, save, read } = setup();
  api.measure.executed = '2026-09-09T12:00:00Z';
  await save();
  expect(api.document?.value.executed).toBe(api.measure.executed);
  expect(api.patches).toHaveLength(0);
  expect((await read()).measures[0].followUp?.status).toBe('completed');
});

test('never executes when the document was not saved', async () => {
  const { api, save } = setup();
  api.failure = 'put-before';
  await expect(save()).rejects.toMatchObject({ status: 503 });
  expect(api.document).toBeUndefined();
  expect(api.patches).toHaveLength(0);
});

test('recovers a lost document response by reading durable answers', async () => {
  const { api, save, read } = setup();
  api.failure = 'put-after';
  await save();
  expect((await read()).measures[0].followUp?.status).toBe('completed');
  expect(api.puts).toBe(1);
});

test('shows pending answers after failed execution and completes with an explicit retry', async () => {
  const { api, save, read } = setup();
  api.failure = 'patch-before';
  await expect(save()).rejects.toMatchObject({ status: 503 });
  expect((await read()).measures[0].followUp).toEqual({ status: 'pending', ...answers });
  await expect(save(3, { ...answers, followUpDescription: 'Ersätt svaren' })).rejects.toMatchObject({ status: 409 });
  api.failure = undefined;
  await save();
  expect((await read()).measures[0].followUp?.status).toBe('completed');
  expect(api.puts).toBe(1);
});

test('accepts an identical retry after a lost execution response despite the old version', async () => {
  const { api, save, read } = setup();
  api.failure = 'patch-after';
  await expect(save()).rejects.toMatchObject({ status: 503 });
  expect((await read()).measures[0].followUp?.status).toBe('completed');
  await save();
  expect(api.puts).toBe(1);
  expect(api.patches).toHaveLength(1);
});

test('preserves answers across a concurrent measure change and requires its fresh version', async () => {
  const { api, save } = setup();
  api.failure = 'stale';
  await expect(save()).rejects.toMatchObject({ status: 412 });
  expect(api.patches).toHaveLength(0);
  await save(4);
  expect(api.measure.executed).toBe(api.document?.value.executed);
  expect(api.puts).toBe(1);
});

test.each(['denied', 'schema'] as const)('fails explicitly for %s without writing', async failure => {
  const { api, save } = setup();
  api.failure = failure;
  await expect(save()).rejects.toMatchObject({ status: failure === 'denied' ? 403 : 503 });
  expect(api.puts).toBe(0);
  expect(api.patches).toHaveLength(0);
});

test.each([{ accept: undefined }, { accept: 'FALSE' }, { plannedStart: undefined }, { addedByUser: 'someone-else' }] as const)(
  'rejects an ineligible measure: %j',
  async fields => {
    const { api, save } = setup();
    api.measure = { ...api.measure, ...fields };
    await expect(save()).rejects.toMatchObject({ status: fields.addedByUser ? 403 : 409 });
    expect(api.puts).toBe(0);
  },
);

test('does not hide a missing schema for an existing document as absent follow-up', async () => {
  const { api, save, read } = setup();
  await save();
  api.failure = 'schema';
  await expect(read()).rejects.toMatchObject({ status: 404 });
});

test('concurrent commands reserve only one immutable answer document', async () => {
  const { api, save } = setup();
  const outcomes = await Promise.allSettled([save(), save(3, { ...answers, followUpDescription: 'Ett annat svar' })]);
  expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1);
  expect(api.document?.value.followUpDescription).toBe(answers.followUpDescription);
  expect(api.patches).toHaveLength(1);
});

test('rejects locked errands and stale measure versions before reserving answers', async () => {
  const { api, save } = setup();
  api.parent.status = 'SOLVED';
  await expect(save()).rejects.toMatchObject({ status: 409 });
  api.parent.status = 'ONGOING';
  await expect(save(2)).rejects.toMatchObject({ status: 412 });
  expect(api.puts).toBe(0);
});

test('ordinary editing cannot change the execution belonging to saved follow-up', async () => {
  const { api, service, save, read } = setup();
  await save();
  await expect(service.update('2281', 'errand-1', 'measure-1', '"4"', { executed: '2026-09-09T00:00:00Z' }, user)).rejects.toMatchObject({
    status: 409,
  });
  api.measure.executed = '2026-09-09T00:00:00Z';
  expect((await read()).measures[0].followUp?.status).toBe('conflict');
  await expect(save(4)).rejects.toMatchObject({ status: 409 });
});
