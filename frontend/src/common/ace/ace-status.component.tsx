import { Label } from '@sk-web-gui/react';
import { PhoneCall, PhoneOff } from 'lucide-react';
import { FC } from 'react';

import { AceStatus, useAceStore } from './ace-store';

const statusLabels: Record<Exclude<AceStatus, 'disabled'>, { text: string; title: string }> = {
  connecting: { text: 'ACE ansluter', title: 'Väntar på anslutning till ACE Interact' },
  connected: { text: 'ACE ansluten', title: 'Inkommande samtal öppnas automatiskt som nya ärenden' },
  disconnected: {
    text: 'ACE ej ansluten',
    title: 'Kontrollera att ACE Interact är inloggat och att ACE-popupfönstret är öppet',
  },
  unavailable: { text: 'ACE ej tillgängligt', title: 'Det gick inte att ladda ACE. Draken fungerar som vanligt.' },
};

/** Shows the state of the ACE integration. Renders nothing when ACE is not configured. */
export const AceStatusIndicator: FC<{ className?: string }> = ({ className }) => {
  const status = useAceStore((s) => s.status);
  if (status === 'disabled') {
    return null;
  }
  const { text, title } = statusLabels[status];
  const isConnected = status === 'connected';
  return (
    <span title={title} data-cy="ace-status" className={className}>
      <Label rounded inverted={!isConnected} color={isConnected ? 'gronsta' : 'warning'}>
        {isConnected ? <PhoneCall className="h-16 w-16" /> : <PhoneOff className="h-16 w-16" />}
        {text}
      </Label>
    </span>
  );
};
