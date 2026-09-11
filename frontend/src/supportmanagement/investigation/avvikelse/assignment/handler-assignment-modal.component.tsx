import { Alert, Button, Modal, Spinner } from '@sk-web-gui/react';
import { FC, useMemo, useState } from 'react';

import {
  type AssignableCandidate,
  type AssignableRole,
  HandlerCandidateSelect,
  sortCandidates,
} from './handler-candidate-select.component';

export type { AssignableCandidate, AssignableRole } from './handler-candidate-select.component';

interface HandlerAssignmentModalProps {
  show: boolean;
  label: string;
  /** Why the errand has to move, shown above the selector. */
  description: string;
  selectLabel: string;
  confirmLabel: string;
  confirmLoadingLabel: string;
  /** Undefined while the candidates are still being loaded. */
  candidates: AssignableCandidate[] | undefined;
  /** Group headings for the selector, like the handler list in the sidebar. */
  roles?: AssignableRole[];
  /** Set when the candidates could not be loaded at all. */
  loadError?: string;
  emptyMessage: string;
  isSaving: boolean;
  error?: string;
  onAssign: (adAccount: string) => void;
  onClose?: () => void;
}

/**
 * Picks the person an errand is handed to.
 *
 * One candidate is preselected, because a list of one is an answer rather than a question - but it
 * is still shown and still confirmed, so the handler sees who is about to receive the errand.
 *
 * `onClose` is omitted for a handover that has to happen: the investigation has already been saved
 * with an answer that moves the errand, and closing the dialog would leave it saved but stranded.
 */
export const HandlerAssignmentModal: FC<HandlerAssignmentModalProps> = ({
  show,
  label,
  description,
  selectLabel,
  confirmLabel,
  confirmLoadingLabel,
  candidates,
  roles,
  loadError,
  emptyMessage,
  isSaving,
  error,
  onAssign,
  onClose,
}) => {
  const sortedCandidates = useMemo(() => sortCandidates(candidates), [candidates]);
  // A list of one is an answer rather than a question, so the first candidate stands as the
  // selection until somebody picks another. Deriving it means no effect has to keep a piece of
  // state in step with a list that arrives later.
  const [chosen, setChosen] = useState<string>();
  const selected =
    chosen && sortedCandidates.some((candidate) => candidate.adAccount === chosen)
      ? chosen
      : sortedCandidates[0]?.adAccount ?? '';

  const isLoading = candidates === undefined && !loadError;

  return (
    <Modal
      show={show}
      label={label}
      className="w-[52rem]"
      data-cy="handler-assignment-modal"
      {...(onClose ? { onClose } : {})}
    >
      <Modal.Content>
        <p className="mb-16">{description}</p>

        {isLoading && (
          <div className="flex items-center gap-12" role="status">
            <Spinner size={2} />
            <span>Hämtar behöriga handläggare...</span>
          </div>
        )}

        {loadError && (
          <Alert type="error" className="mb-16">
            <Alert.Icon />
            <Alert.Content>
              <Alert.Content.Description>{loadError}</Alert.Content.Description>
            </Alert.Content>
          </Alert>
        )}

        {!isLoading && !loadError && sortedCandidates.length === 0 && (
          <Alert type="warning" className="mb-16" data-cy="handler-assignment-empty">
            <Alert.Icon />
            <Alert.Content>
              <Alert.Content.Description>{emptyMessage}</Alert.Content.Description>
            </Alert.Content>
          </Alert>
        )}

        {sortedCandidates.length > 0 && (
          // No visible label: the description above already says what is being chosen, and the
          // group headings name the roles. It stays as the accessible name for the select.
          <HandlerCandidateSelect
            id="handler-assignment"
            selectLabel={selectLabel}
            candidates={sortedCandidates}
            roles={roles}
            value={selected}
            onChange={setChosen}
          />
        )}

        {error && (
          <Alert type="error" className="mt-16" data-cy="handler-assignment-error">
            <Alert.Icon />
            <Alert.Content>
              <Alert.Content.Description>{error}</Alert.Content.Description>
            </Alert.Content>
          </Alert>
        )}
      </Modal.Content>
      <Modal.Footer>
        <Button
          variant="primary"
          color="vattjom"
          className="w-full"
          data-cy="handler-assignment-confirm"
          disabled={isSaving || selected === ''}
          loading={isSaving}
          loadingText={confirmLoadingLabel}
          onClick={() => onAssign(selected)}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
