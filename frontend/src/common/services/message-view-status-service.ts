export type MessageViewedValue = boolean | string | undefined;

export type MessageViewNode<TNode> = {
  viewed?: MessageViewedValue;
  conversationId?: string;
  messageId?: string;
  children?: TNode[];
};

export type ConversationMessageKey = {
  conversationId?: string;
  messageId?: string;
};

export const isMessageViewed = (message: { viewed?: MessageViewedValue }): boolean => {
  return message.viewed === true || message.viewed === 'true';
};

export const countUnreadMessages = <TNode extends MessageViewNode<TNode>>(tree?: TNode[]): number => {
  if (!tree) {
    return 0;
  }

  return tree.reduce((count, node) => {
    const nodeCount = isMessageViewed(node) ? 0 : 1;
    return count + nodeCount + countUnreadMessages(node.children);
  }, 0);
};

export const markConversationMessageViewed = <TNode extends MessageViewNode<TNode>>(
  tree: TNode[],
  selectedMessage: ConversationMessageKey,
  viewedValue: NonNullable<TNode['viewed']>
): TNode[] => {
  return tree.map((node) => ({
    ...node,
    viewed:
      node.conversationId === selectedMessage.conversationId && node.messageId === selectedMessage.messageId
        ? viewedValue
        : node.viewed,
    children: node.children
      ? markConversationMessageViewed(node.children, selectedMessage, viewedValue)
      : node.children,
  }));
};
