import type { IErrand } from '@casedata/interfaces/errand';
import { apiService } from '@common/services/api-service';
import type { RelationWithErrandNumber } from '@common/services/relations-service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getOrCreateConversationId } from './casedata-conversation-service';

vi.mock('@common/services/api-service', () => ({ apiService: { get: vi.fn(), post: vi.fn() } }));

const errand = { id: 1, errandNumber: 'MEX-1' } as IErrand;
const relationErrands = [
  { relation: { id: 'relation-1' }, errandNumber: 'MEX-2', otherResourceId: 'errand-2' },
] as RelationWithErrandNumber[];

const givenConversations = (conversations: object[]) =>
  vi.mocked(apiService.get).mockResolvedValue({ data: { data: { data: conversations } } } as never);

const createdBody = () => vi.mocked(apiService.post).mock.calls[0]?.[1];

beforeEach(() => {
  vi.mocked(apiService.get).mockReset();
  vi.mocked(apiService.post)
    .mockReset()
    .mockResolvedValue({ data: { data: { id: 'new-conversation' } } } as never);
});

describe('getOrCreateConversationId', () => {
  test('creates Mina sidor conversation without relation even if a relation is still selected', async () => {
    givenConversations([]);

    const id = await getOrCreateConversationId('2281', errand, 'minasidor', 'errand-2', relationErrands, '');

    expect(id).toBe('new-conversation');
    expect(createdBody()).toEqual({ topic: 'Mina sidor', type: 'EXTERNAL' });
  });

  test('creates Katla conversation without relation even if a relation is still selected', async () => {
    givenConversations([]);

    await getOrCreateConversationId('2281', errand, 'katla', 'errand-2', relationErrands, '');

    expect(createdBody()).toEqual({ topic: 'MEX-1', type: 'INTERNAL' });
  });

  test('creates Draken conversation linked to the selected relation', async () => {
    givenConversations([]);

    await getOrCreateConversationId('2281', errand, 'draken', 'errand-2', relationErrands, '');

    expect(createdBody()).toEqual({ topic: 'MEX-1 - MEX-2', type: 'INTERNAL', relationIds: ['relation-1'] });
  });

  test('never reuses an external conversation for Draken', async () => {
    givenConversations([{ id: 'external', type: 'EXTERNAL', relationIds: [] }]);

    const id = await getOrCreateConversationId('2281', errand, 'draken', '', [], '');

    expect(id).toBe('new-conversation');
  });
});
