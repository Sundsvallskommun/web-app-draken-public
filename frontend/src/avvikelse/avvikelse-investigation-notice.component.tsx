'use client';

import { Alert } from '@sk-web-gui/react';

import { useSupportApplicationProfileStore } from '../supportmanagement/application/support-application-profile-store';

/**
 * Rendered above the errand tab strip so a profile fault is visible from any tab, not only after
 * opening Utredning. The tab itself explains the same states again once opened.
 */
export function AvvikelseInvestigationNotice() {
  const profile = useSupportApplicationProfileStore((state) => state.profile);
  const status = useSupportApplicationProfileStore((state) => state.status);
  const unavailable = status === 'ready' && profile?.state === 'unavailable';

  if (status !== 'error' && !unavailable) return null;

  return (
    <Alert
      type="warning"
      className="mb-16"
      data-cy={unavailable ? 'investigation-profile-unavailable' : 'investigation-profile-error'}
    >
      <Alert.Icon />
      <Alert.Content>
        <Alert.Content.Title>
          {unavailable ? 'Utredningsfunktionen är tillfälligt otillgänglig' : 'Utredningsprofilen kunde inte laddas'}
        </Alert.Content.Title>
        <Alert.Content.Description>
          Utredningsflikarna är tillfälligt avstängda. Befintliga utredningsuppgifter döljs inte från Ärendeuppgifter.
        </Alert.Content.Description>
      </Alert.Content>
    </Alert>
  );
}
