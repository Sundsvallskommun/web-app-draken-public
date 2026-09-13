import { beforeEach, expect, it, vi } from 'vitest';

import { MUNICIPALITY_ID } from '@/config';
import { ConversationType } from '@/data-contracts/case-data/data-contracts';
import { createConversation, sendConversationTextMessage } from '@/integrations/casedata-conversations';

import { mockUser } from './helpers/http';

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('@/services/api.service', () => ({
  default: class {
    post = post;
  },
}));
beforeEach(() => {
  post.mockReset();
});

it('creates the conversation in the selected handover namespace using the caller identity and relation', async () => {
  const user = mockUser();
  post.mockResolvedValue({ data: { id: 'test-conversation' } });
  const result = await createConversation('test-errand', user, ConversationType.INTERNAL, 'Överlämning', 'destination', ['test-relation']);
  expect(result.id).toBe('test-conversation');
  expect(post).toHaveBeenCalledWith(
    expect.objectContaining({
      url: `${MUNICIPALITY_ID}/destination/errands/test-errand/communication/conversations`,
      data: { type: 'INTERNAL', topic: 'Överlämning', relationIds: ['test-relation'] },
    }),
    user,
  );
});

it('refuses a successful upstream response without a conversation id before constructing a message URL', async () => {
  post.mockResolvedValue({ data: {} });
  await expect(createConversation('test-errand', mockUser(), ConversationType.INTERNAL, 'Överlämning', 'destination')).rejects.toThrow(
    'without an id',
  );
});

it('sends the text as a multipart message to the selected conversation', async () => {
  const user = mockUser();
  post.mockImplementation(async (request: { url: string; data: FormData; headers: Record<string, string> }, identity: typeof user) => {
    expect(request.url).toBe(`${MUNICIPALITY_ID}/destination/errands/test-errand/communication/conversations/test-conversation/messages`);
    expect(request.headers['Content-Type']).toBe('multipart/form-data');
    expect(JSON.parse(String(request.data.get('message')))).toEqual({
      createdBy: { type: 'adAccount', value: user.username },
      content: 'Test message',
    });
    expect(identity).toBe(user);
    return { data: {} };
  });
  await sendConversationTextMessage('test-errand', 'test-conversation', user, 'Test message', 'destination');
  expect(post).toHaveBeenCalledOnce();
});
