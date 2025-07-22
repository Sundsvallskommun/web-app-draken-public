import { MessageNode } from '@casedata/services/casedata-message-service';
import { Avatar } from '@sk-web-gui/react';
import { Message } from '@supportmanagement/services/support-message-service';

const getSenderInitials = (msg: MessageNode | Message): string => {
  if ('firstName' in msg && 'lastName' in msg) {
    return `${msg.firstName?.[0]}${msg.lastName?.[0]}`;
  }
  if ('sender' in msg && msg) {
    const parts = msg.sender.trim().split(' ');
    if (parts.length >= 2) {
      const firstInitial = parts[0]?.[0] ?? '';
      const lastInitial = parts[1]?.[0] ?? '';
      return `${firstInitial}${lastInitial}`;
    }
  }
  return '@';
};

export const MessageAvatar: React.FC<{
  message: MessageNode | Message;
}> = ({ message }) => {
  return (
    <Avatar
      rounded
      color={message.direction === 'OUTBOUND' ? 'juniskar' : 'bjornstigen'}
      size={'md'}
      initials={getSenderInitials(message)}
    />
  );
};
