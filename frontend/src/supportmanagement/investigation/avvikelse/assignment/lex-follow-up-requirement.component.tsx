'use client';

import { Button, Modal } from '@sk-web-gui/react';
import { FC } from 'react';

import type { InvestigationPhaseEntryRequirementProps } from '../../investigation-variant';

/**
 * Shown to a LEX handler instead of the move to the follow-up. The follow-up is the unit's: LEX hands the decided
 * errand back with Återlämna till chef in the decision, and the manager starts the follow-up from there.
 */
export const LexFollowUpRequirement: FC<InvestigationPhaseEntryRequirementProps> = ({ onClose }) => (
  <Modal
    show
    label="Uppföljningen görs av enheten"
    className="w-[52rem]"
    data-cy="lex-follow-up-requirement"
    onClose={onClose}
  >
    <Modal.Content>
      <p>
        Som LEX-ansvarig eller LEX-utredare tar du inte ärendet till uppföljning. Återlämna det till chefen med
        Återlämna till chef längst ned i beslutet, så tar chefen det vidare till uppföljning.
      </p>
    </Modal.Content>
    <Modal.Footer>
      <Button variant="primary" color="vattjom" className="w-full" onClick={onClose}>
        Stäng
      </Button>
    </Modal.Footer>
  </Modal>
);
