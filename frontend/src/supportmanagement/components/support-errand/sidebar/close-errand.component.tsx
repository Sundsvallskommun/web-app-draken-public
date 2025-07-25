import { User } from '@common/interfaces/user';
import { isIK, isKA, isLOP, isROB } from '@common/services/application-service';
import { deepFlattenToObject } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, FormControl, Modal, RadioButton, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import {
  Resolution,
  ResolutionLabelIK,
  ResolutionLabelKA,
  ResolutionLabelKS,
  ResolutionLabelLOP,
  ResolutionLabelROB,
  Status,
  SupportErrand,
  closeSupportErrand,
  getSupportErrandById,
} from '@supportmanagement/services/support-errand-service';
import { sendClosingMessage } from '@supportmanagement/services/support-message-service';
import { applicantHasContactChannel, getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';

export const CloseErrandComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const {
    user,
    supportAdmins,
    municipalityId,
    supportErrand,
    setSupportErrand,
  }: {
    user: User;
    supportAdmins: SupportAdmin[];
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: any;
  } = useAppContext();
  const confirm = useConfirm();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(
    isROB() ? Resolution.RECRUITED : isLOP() || isIK() ? Resolution.CLOSED : Resolution.SOLVED
  );

  const [closingMessage, setClosingMessage] = useState<boolean>(false);

  const formControls: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const handleCloseErrand = (resolution: Resolution, msg: boolean) => {
    setIsLoading(true);
    setError(false);
    return closeSupportErrand(supportErrand.id, municipalityId, resolution)
      .then(() => {
        if (msg) {
          const admin = supportAdmins.find((a) => a.adAccount === supportErrand.assignedUserId);
          const adminName = getAdminName(admin, supportErrand);
          return sendClosingMessage(adminName, supportErrand, municipalityId);
        }
      })
      .then(() => {
        toastMessage(
          getToastOptions({
            message: 'Ärendet avslutades',
            status: 'success',
          })
        );
        setTimeout(() => {
          window.close();
        }, 2000);
        setIsLoading(false);
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet skulle avslutas',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  return (
    <>
      <Button
        className="w-full"
        color="vattjom"
        data-cy="solved-button"
        leftIcon={<LucideIcon name="check" />}
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
      <Modal
        show={showModal}
        label={
          Object.values(deepFlattenToObject(formControls.formState.dirtyFields)).some((v) => v)
            ? 'Du har osparade ändringar'
            : 'Avsluta ärende'
        }
        className="w-[52rem]"
        onClose={() => setShowModal(false)}
      >
        {Object.values(deepFlattenToObject(formControls.formState.dirtyFields)).some((v) => v) ? (
          <>
            <Modal.Content>
              <p>Ärendet kan inte avslutas då du har osparade ändringar. Var god spara för att fortsätta.</p>
            </Modal.Content>
            <Modal.Footer>
              <Button onClick={() => setShowModal(false)} variant="primary" color="vattjom">
                Ok
              </Button>
            </Modal.Footer>
          </>
        ) : (
          <>
            <Modal.Content>
              <p className="text-content font-semibold">Välj en lösning</p>
              <FormControl id="resolution" className="w-full" required>
                <RadioButton.Group data-cy="solve-radiolist">
                  {Object.entries(
                    isLOP()
                      ? ResolutionLabelLOP
                      : isIK()
                      ? ResolutionLabelIK
                      : isKA()
                      ? ResolutionLabelKA
                      : isROB()
                      ? ResolutionLabelROB
                      : ResolutionLabelKS
                  )
                    .filter(([_key, _label]) => _label !== 'Vidarebefordrat via växelprogrammet')
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([_key, _label], idx) => (
                      <RadioButton
                        key={_key}
                        value={_key}
                        defaultChecked={_key === selectedResolution}
                        onClick={(e) => setSelectedResolution((e.target as HTMLInputElement).value as Resolution)}
                      >
                        {_label}
                      </RadioButton>
                    ))}
                </RadioButton.Group>
              </FormControl>
            </Modal.Content>
            <Modal.Footer className="flex flex-col">
              {(isLOP() || isIK() || isKA()) && (
                <FormControl id="closingmessage" className="w-full mb-sm px-2">
                  <Checkbox
                    id="closingmessagecheckbox"
                    disabled={!applicantHasContactChannel(supportErrand)}
                    data-cy="show-contactReasonDescription-input"
                    className="w-full"
                    checked={applicantHasContactChannel(supportErrand) && closingMessage}
                    onChange={() => setClosingMessage(!closingMessage)}
                  >
                    Skicka meddelande till ärendeägare
                  </Checkbox>
                </FormControl>
              )}
              <Button
                variant="primary"
                color="vattjom"
                disabled={isLoading || disabled}
                className="w-full"
                loading={isLoading}
                loadingText="Avslutar ärende"
                onClick={() => {
                  handleCloseErrand(selectedResolution, closingMessage).then(() => {
                    setShowModal(false);
                  });
                }}
              >
                Avsluta ärende
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};
