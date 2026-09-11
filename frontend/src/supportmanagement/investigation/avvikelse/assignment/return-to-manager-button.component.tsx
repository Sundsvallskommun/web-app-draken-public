import { Alert, Button } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { FC, useState } from 'react';

import {
  applyInvestigationHandover,
  getUnitManager,
  investigationHandoverErrorMessage,
  type ManagerRoleOption,
  type UnitManagerCandidate,
} from './avvikelse-assignment-service';
import { HandlerAssignmentModal } from './handler-assignment-modal.component';

interface ReturnToManagerButtonProps {
  municipalityId: string;
  errandId: string;
  expectedVersion: number | undefined;
  disabled: boolean;
}

/**
 * Hands a finished LEX investigation back to a manager for the place it concerns.
 *
 * The candidates come from AccessMapper: whose access patterns cover the place, narrowed to those
 * holding a manager role there. They are grouped by role - enhetschef, verksamhetschef - the way the
 * handler list in the sidebar is, and the investigator picks one. The backend resolves the same list
 * when it writes and refuses anybody outside it, so the picker cannot widen who may receive it.
 *
 * Removing the LEX label is what gives the errand back. Whether the investigator still sees it
 * afterwards is AccessMapper's answer, not this component's - they may well reach it through some
 * other pattern - so nothing here claims the errand disappears from their list.
 */
export const ReturnToManagerButton: FC<ReturnToManagerButtonProps> = ({
  municipalityId,
  errandId,
  expectedVersion,
  disabled,
}) => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [candidates, setCandidates] = useState<UnitManagerCandidate[] | undefined>();
  const [roles, setRoles] = useState<ManagerRoleOption[]>([]);
  const [locationName, setLocationName] = useState('');
  const [loadError, setLoadError] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const openModal = async () => {
    setShowModal(true);
    setCandidates(undefined);
    setLoadError(undefined);
    setError(undefined);
    setIsResolving(true);
    try {
      const response = await getUnitManager(municipalityId, errandId);
      setLocationName(response.locationDisplayName);
      setRoles(response.roles ?? []);
      setCandidates(response.candidates);
    } catch (e) {
      setLoadError(investigationHandoverErrorMessage(e, 'Cheferna för ärendets plats kunde inte hämtas. Försök igen.'));
    } finally {
      setIsResolving(false);
    }
  };

  const returnErrand = async (adAccount: string) => {
    if (typeof expectedVersion !== 'number') {
      setError('Ärendets version saknas. Ladda om ärendet innan du återlämnar det.');
      return;
    }

    setIsSaving(true);
    setError(undefined);
    try {
      await applyInvestigationHandover(municipalityId, errandId, 'return-to-manager', expectedVersion, adAccount);
      router.push('/oversikt');
    } catch (e) {
      setError(investigationHandoverErrorMessage(e, 'Ärendet kunde inte återlämnas. Försök igen.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        disabled={disabled || isResolving}
        loading={isResolving}
        loadingText="Hämtar chefer"
        data-cy="return-to-manager-button"
        onClick={() => void openModal()}
      >
        Återlämna till chef
      </Button>

      {showModal && (
        <HandlerAssignmentModal
          show={showModal}
          label="Återlämna ärendet till chef"
          description={
            locationName
              ? `Ärendet återlämnas till en chef för ${locationName}.`
              : 'Ärendet återlämnas till en chef för platsen det gäller.'
          }
          selectLabel="Chef"
          confirmLabel="Återlämna ärendet"
          confirmLoadingLabel="Återlämnar ärendet"
          candidates={candidates}
          roles={roles}
          loadError={loadError}
          emptyMessage="Ingen chef är konfigurerad för ärendets plats. Kontakta support innan ärendet återlämnas."
          isSaving={isSaving}
          error={error}
          onAssign={(adAccount) => void returnErrand(adAccount)}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

/** Shown when the errand is not in a state where it can be returned, so the reason is visible. */
export const ReturnToManagerUnavailable: FC<{ message: string }> = ({ message }) => (
  <Alert type="info" className="mb-24">
    <Alert.Icon />
    <Alert.Content>
      <Alert.Content.Description>{message}</Alert.Content.Description>
    </Alert.Content>
  </Alert>
);
