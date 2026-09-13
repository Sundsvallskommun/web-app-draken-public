import { MUNICIPALITY_ID } from '@/config';
import { apiServiceName } from '@/config/api-config';
import type { Conversation } from '@/data-contracts/case-data/data-contracts';
import type { User } from '@/interfaces/users.interface';
import ApiService from '@/services/api.service';
import { apiURL } from '@/utils/util';

const SERVICE = apiServiceName('case-data');

export const createConversation = async (
  errandId: string,
  user: User,
  conversationType: Conversation['type'],
  topic: string,
  namespace: string,
  relationIds?: string[],
) => {
  const apiService = new ApiService();
  const baseURL = apiURL(SERVICE);
  const url = `${MUNICIPALITY_ID}/${namespace}/errands/${errandId}/communication/conversations`;
  const body: Conversation = {
    topic: topic,
    type: conversationType,
  };

  if (relationIds?.length) {
    body.relationIds = relationIds;
  }

  const res = await apiService.post<Conversation, Conversation>({ url, baseURL, data: body }, user);

  if (!res.data.id) throw new Error('CaseData returned a conversation without an id');
  return { ...res.data, id: res.data.id };
};

export const sendConversationTextMessage = async (errandId: string, conversationId: string, user: User, content: string, namespace: string) => {
  const apiService = new ApiService();
  const baseURL = apiURL(SERVICE);
  const url = `${MUNICIPALITY_ID}/${namespace}/errands/${errandId}/communication/conversations/${conversationId}/messages`;

  const formData = new FormData();
  const messageObj = {
    createdBy: { type: 'adAccount', value: user.username },
    content: content,
  };
  formData.append('message', JSON.stringify(messageObj));

  return await apiService.post<unknown, FormData>({ url, baseURL, data: formData, headers: { 'Content-Type': 'multipart/form-data' } }, user);
};
