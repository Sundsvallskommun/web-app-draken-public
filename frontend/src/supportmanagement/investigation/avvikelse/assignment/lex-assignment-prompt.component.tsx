import { useUserStore } from '@stores/index';
import { useRouter } from 'next/navigation';
import { FC, useMemo, useState } from 'react';

import { applyInvestigationHandover, investigationHandoverErrorMessage } from './avvikelse-assignment-service';
import { LEX_MANAGER_ROLE_KEY } from './avvikelse-handler-roles';
import { HandlerAssignmentModal } from './handler-assignment-modal.component';

interface LexAssignmentPromptProps {
  show: boolean;
  municipalityId: string;
  errandId: string;
  /** The errand version the investigation was saved against; the backend rejects a stale one. */
  expectedVersion: number | undefined;
}

/**
 * Asks the unit manager to hand a suspected misconduct to a LEX manager.
 *
 * The dialog has no close button on purpose. The investigation is already saved with the assessment
 * that requires the handover, so dismissing it would leave the errand classified as a suspected
 * misconduct with nobody able to act on it.
 *
 * Once the handover lands, the errand belongs to the LEX roles: Support Management's AccessMapper
 * stops showing it to the manager who just handed it over. There is therefore nothing left to
 * re-render, and this navigates to the overview rather than refreshing an errand that is gone.
 */
export const LexAssignmentPrompt: FC<LexAssignmentPromptProps> = ({
  show,
  municipalityId,
  errandId,
  expectedVersion,
}) => {
  const administrators = useUserStore((s) => s.administrators);
  const handlerDirectoryState = useUserStore((s) => s.handlerDirectoryState);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const candidates = useMemo(
    () =>
      administrators
        .filter((administrator) => administrator.roleKeys?.includes(LEX_MANAGER_ROLE_KEY))
        .map((administrator) => ({ adAccount: administrator.adAccount, displayName: administrator.displayName })),
    [administrators]
  );

  // An empty list only means "nobody holds this role" once the directory has actually been read.
  // Claiming that while the lookup is failing sends the handler to support over a passing outage.
  const loadedCandidates = handlerDirectoryState === 'ready' ? candidates : undefined;
  const loadError =
    handlerDirectoryState === 'error'
      ? 'Listan över behöriga handläggare kunde inte hämtas. Ladda om sidan och försök igen.'
      : undefined;

  const assign = async (adAccount: string) => {
    if (typeof expectedVersion !== 'number') {
      setError('Ärendets version saknas. Ladda om ärendet innan du tilldelar en LEX-ansvarig.');
      return;
    }

    setIsSaving(true);
    setError(undefined);
    try {
      await applyInvestigationHandover(municipalityId, errandId, 'assign-lex', expectedVersion, adAccount);
      router.push('/oversikt');
    } catch (e) {
      setError(investigationHandoverErrorMessage(e, 'Ärendet kunde inte tilldelas en LEX-ansvarig. Försök igen.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <HandlerAssignmentModal
      show={show}
      label="Ärendet är klassificerat som missförhållande"
      description="Ärendet är nu klassificerat som ett misstänkt missförhållande och måste tilldelas en LEX-ansvarig. Rapporttypen ändras från Avvikelse till Missförhållande, och när ärendet är tilldelat lämnar det din ärendelista."
      selectLabel="LEX-ansvarig"
      confirmLabel="Tilldela LEX-ansvarig"
      confirmLoadingLabel="Tilldelar LEX-ansvarig"
      candidates={loadedCandidates}
      loadError={loadError}
      emptyMessage="Ingen LEX-ansvarig är konfigurerad för den här verksamheten. Kontakta support innan du går vidare."
      isSaving={isSaving}
      error={error}
      onAssign={(adAccount) => void assign(adAccount)}
    />
  );
};
