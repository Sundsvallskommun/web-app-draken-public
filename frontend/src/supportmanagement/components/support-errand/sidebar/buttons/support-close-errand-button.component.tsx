import { Button } from '@sk-web-gui/react';
import { useSupportStore } from '@stores/index';
import { Status } from '@supportmanagement/services/support-errand-service';
import { Check } from 'lucide-react';
import React, { useState } from 'react';

import { SupportCloseErrandModal } from './support-close-errand-modal.component';

export const SupportCloseErrandButtonComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button
        className="w-full"
        color="vattjom"
        data-cy="solved-button"
        leftIcon={<Check />}
        variant={
          !!(supportErrand?.status as Status) &&
          [Status.NEW, Status.PENDING, Status.AWAITING_INTERNAL_RESPONSE, Status.SUSPENDED, Status.ASSIGNED].includes(
            supportErrand?.status as Status
          )
            ? 'secondary'
            : 'primary'
        }
        disabled={disabled}
        onClick={() => {
          setShowModal(true);
        }}
      >
        Avsluta ärendet
      </Button>
      <SupportCloseErrandModal show={showModal} onClose={() => setShowModal(false)} disabled={disabled} />
    </>
  );
};
