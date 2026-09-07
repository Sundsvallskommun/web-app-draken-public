import { Avatar } from '@sk-web-gui/react';
import { FC } from 'react';

interface MessageSender {
  direction?: string;
  firstName?: string;
  lastName?: string;
  sender?: string;
}

export const getSenderInitials = (message: MessageSender): string => {
  if ('firstName' in message && 'lastName' in message) {
    return `${message.firstName?.[0] ?? ''}${message.lastName?.[0] ?? ''}` || '@';
  }
  if (message.sender) {
    const parts = message.sender.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstInitial = parts[0]?.[0] ?? '';
      const lastInitial = parts[1]?.[0] ?? '';
      return `${firstInitial}${lastInitial}`;
    }
  }
  return '@';
};

export const MessageAvatar: FC<{
  message: MessageSender;
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
