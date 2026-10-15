import { isBOU, isIK, isKA, isKC, isLOK, isLOP, isROB, isSE } from '@common/services/application-service';
import { deepFlattenToObject } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { Button, Checkbox, Divider, FormControl, Modal, RadioButton, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  closeSupportErrand,
  getSupportErrandById,
  Resolution,
  ResolutionDescriptionKS,
  ResolutionLabelBOU,
  ResolutionLabelIK,
  ResolutionLabelKA,
  ResolutionLabelKS,
  ResolutionLabelKSLegacy,
  ResolutionLabelLOK,
  ResolutionLabelLOP,
  ResolutionLabelROB,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { sendClosingMessage } from '@supportmanagement/services/support-message-service';
import { applicantHasContactChannel, getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { ArrowLeft, Check, Info } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

const RESOLUTION_DESCRIPTION =
  'Du kan avsluta ärendet med nuvarande lösningskod, eller ändra om något i ärendet har påverkat lösningen.';
const HANDOVER_DESCRIPTION =
  'Ärendet är överlämnat och avslutat med lösningskoden nedan. Ändra den om den inte speglar vad du har gjort.';

const getResolutionLabels = (): Record<string, string> => {
  if (isLOP()) return ResolutionLabelLOP;
  if (isIK() || isSE()) return ResolutionLabelIK;
  if (isKA()) return ResolutionLabelKA;
  if (isROB()) return ResolutionLabelROB;
  if (isBOU()) return ResolutionLabelBOU;
  if (isLOK()) return ResolutionLabelLOK;
  return ResolutionLabelKS;
};

/** Per-code explanation shown on demand in the picker; only KS has them. */
const getResolutionDescriptions = (): Record<string, string> => (isKC() ? ResolutionDescriptionKS : {});

/** Labels for an already saved code, including codes no longer in the picker. */
const getResolutionDisplayLabels = (): Record<string, string> => ({
  ...ResolutionLabelKSLegacy,
  ...getResolutionLabels(),
});

const getDefaultResolution = (errand: SupportErrand | undefined): Resolution => {
  if (errand?.resolution) return errand.resolution as Resolution;
  if (isROB()) return Resolution.NEED_MET;
  if (isKC()) return Resolution.INFORMED;
  if (appConfig.features.useClosedAsDefaultResolution) return Resolution.CLOSED;
  return Resolution.SOLVED;
};

/**
 * The "Avsluta ärendet" modal. Opened from the close button, or (`afterHandover`) right after a handover on
 * the already closed source errand, where it only offers to change the code.
 */
export const SupportCloseErrandModal: React.FC<{
  show: boolean;
  onClose: () => void;
  disabled?: boolean;
  afterHandover?: boolean;
}> = ({ show, onClose, disabled = false, afterHandover = false }) => {
  const user = useUserStore((s) => s.user);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(getDefaultResolution(supportErrand));

  const [closingMessage, setClosingMessage] = useState<boolean>(false);
  const [changeResolution, setChangeResolution] = useState<boolean>(false);
  // Code whose explanation is expanded; one at a time.
  const [expandedDescription, setExpandedDescription] = useState<string | undefined>();
  const resolutionDescriptions = getResolutionDescriptions();

  const formControls: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  // The errand may have changed since mount (reopened, handed over), so start from its current code.
  useEffect(() => {
    if (show) setSelectedResolution(getDefaultResolution(supportErrand));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const showCloseErrorToast = (message = 'Något gick fel när ärendet skulle avslutas') => {
    toastMessage({
      position: 'bottom',
      closeable: false,
      message,
      status: 'error',
    });
  };

  const closeModal = () => {
    setChangeResolution(false);
    setExpandedDescription(undefined);
    onClose();
  };

  // When an errand is closed without a handler (e.g. directly from status NEW), the user who
  // closes it becomes the handler so the errand has a responsible person. Returns the resulting
  // assigned user (the existing handler if one is already set).
  const ensureHandlerAssigned = async (errandId: string): Promise<string | undefined> => {
    if (supportErrand?.assignedUserId) return supportErrand.assignedUserId;
    const currentAdmin = administrators.find((a) => a.adAccount === user.username);
    if (currentAdmin) {
      await setSupportErrandAdmin(errandId, municipalityId, currentAdmin.adAccount, undefined, currentAdmin.adAccount);
      return currentAdmin.adAccount;
    }
    return undefined;
  };

  const handleCloseErrand = async (resolution: Resolution, msg: boolean) => {
    if (!supportErrand?.id) return;
    const errandId = supportErrand.id;
    setIsLoading(true);
    let assignedUserId: string | undefined;
    try {
      assignedUserId = await ensureHandlerAssigned(errandId);
      await closeSupportErrand(errandId, municipalityId, resolution);
    } catch (e) {
      console.error('Failed to close support errand', e);
      showCloseErrorToast();
      setIsLoading(false);
      return;
    }

    if (msg) {
      try {
        const admin = administrators.find((a) => a.adAccount === assignedUserId);
        const adminName = getAdminName(admin!);
        await sendClosingMessage(adminName, supportErrand, municipalityId);
      } catch (e) {
        console.error('Failed to send closing message', e);
        showCloseErrorToast('Ärendet avslutades men avslutningsmeddelandet kunde inte skickas');
        setIsLoading(false);
        getSupportErrandById(errandId, municipalityId)
          .then((res) => setSupportErrand(res.errand))
          .catch((e) => console.error('Failed to refetch errand after close', e));
        return;
      }
    }

    toastMessage(
      getToastOptions({
        message: afterHandover ? 'Lösningskoden ändrades' : 'Ärendet avslutades',
        status: 'success',
      })
    );
    setTimeout(() => {
      window.close();
    }, 2000);
    setIsLoading(false);
    getSupportErrandById(errandId, municipalityId)
      .then((res) => setSupportErrand(res.errand))
      .catch((e) => console.error('Failed to refetch errand after close', e));
  };

  const hasResolution = !!supportErrand?.resolution && supportErrand?.resolution !== '';
  const hasUnsavedChanges = Object.values(deepFlattenToObject(formControls.formState.dirtyFields)).some(Boolean);

  return (
    <Modal
      show={show}
      label={
        hasUnsavedChanges ? (
          'Du har osparade ändringar'
        ) : changeResolution ? (
          <div className="flex flex-row gap-8">
            <ArrowLeft size={24} onClick={() => setChangeResolution(false)} className="hover:cursor-pointer" /> Avsluta
            ärendet
          </div>
        ) : (
          'Avsluta ärendet'
        )
      }
      className={hasResolution ? 'w-[67.2rem]' : 'w-[52rem]'}
      onClose={closeModal}
    >
      {hasUnsavedChanges ? (
        <>
          <Modal.Content>
            <p>Ärendet kan inte avslutas då du har osparade ändringar. Var god spara för att fortsätta.</p>
          </Modal.Content>
          <Modal.Footer>
            <Button onClick={closeModal} variant="primary" color="vattjom">
              Ok
            </Button>
          </Modal.Footer>
        </>
      ) : hasResolution && !changeResolution ? (
        <div>
          <span>{afterHandover ? HANDOVER_DESCRIPTION : RESOLUTION_DESCRIPTION}</span>
          <div className="bg-vattjom-background-100 rounded-12 p-16 mt-24">
            <div className="flex justify-between items-center">
              <div className="flex flex-col gap-8">
                <span>Nuvarande lösningskod</span>
                <span className="font-bold" data-cy="current-resolution">
                  {getResolutionDisplayLabels()[supportErrand?.resolution ?? ''] || supportErrand?.resolution}
                </span>
              </div>
              <Button variant="secondary" onClick={() => setChangeResolution(true)}>
                Ändra lösningskod
              </Button>
            </div>
          </div>
          {afterHandover ? (
            // The handover already closed the errand; nothing to save here.
            <Button className="mt-32" variant="primary" color="vattjom" leftIcon={<Check />} onClick={closeModal}>
              Klart
            </Button>
          ) : (
            <Button
              className="mt-32"
              variant="primary"
              color="vattjom"
              leftIcon={<Check />}
              onClick={async () => {
                try {
                  await ensureHandlerAssigned(supportErrand.id ?? '');
                  await setSupportErrandStatus(supportErrand.id ?? '', municipalityId, Status.SOLVED);
                  window.close();
                } catch (e) {
                  console.error('Failed to close support errand', e);
                  showCloseErrorToast();
                }
              }}
            >
              Avsluta
            </Button>
          )}
        </div>
      ) : (
        <>
          <Modal.Content>
            {changeResolution && (
              <span className="pb-24">{afterHandover ? HANDOVER_DESCRIPTION : RESOLUTION_DESCRIPTION}</span>
            )}
            <p className="text-content font-semibold pb-24 ">
              {changeResolution ? 'Välj ny lösningskod' : 'Välj en lösningskod'}
            </p>

            <FormControl id="resolution" className="w-full" required>
              <RadioButton.Group data-cy="solve-radiolist">
                {Object.entries(getResolutionLabels())
                  // KS codes are listed in their defined order, the others alphabetically.
                  .sort((a, b) => (isKC() ? 0 : a[1].localeCompare(b[1])))
                  .map(([_key, _label], idx, arr) => (
                    <React.Fragment key={_key}>
                      <div className="flex items-center justify-between">
                        <RadioButton
                          value={_key}
                          defaultChecked={_key === selectedResolution}
                          onClick={(e) => setSelectedResolution((e.target as HTMLInputElement).value as Resolution)}
                        >
                          {_label}
                        </RadioButton>
                        {resolutionDescriptions[_key] && (
                          <Button
                            variant="tertiary"
                            size="sm"
                            iconButton
                            leftIcon={<Info />}
                            aria-label={`Förklaring av ${_label}`}
                            aria-expanded={expandedDescription === _key}
                            aria-controls={`resolution-description-${_key}`}
                            data-cy={`resolution-info-${_key}`}
                            onClick={() => setExpandedDescription(expandedDescription === _key ? undefined : _key)}
                          />
                        )}
                      </div>
                      {expandedDescription === _key && (
                        <div
                          id={`resolution-description-${_key}`}
                          data-cy={`resolution-description-${_key}`}
                          className="bg-vattjom-background-100 rounded-12 p-16"
                        >
                          {resolutionDescriptions[_key]}
                        </div>
                      )}
                      {idx !== arr.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
              </RadioButton.Group>
            </FormControl>
          </Modal.Content>
          <Modal.Footer className="flex flex-col">
            {appConfig.features.useClosingMessageCheckbox && (
              <FormControl id="closingmessage" className="w-full mb-sm px-2">
                <Checkbox
                  id="closingmessagecheckbox"
                  disabled={!applicantHasContactChannel(supportErrand!)}
                  data-cy="show-closing-message-input"
                  className="w-full"
                  checked={applicantHasContactChannel(supportErrand!) && closingMessage}
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
              className="w-fit"
              leftIcon={<Check />}
              loading={isLoading}
              loadingText="Avslutar ärende"
              onClick={() => {
                handleCloseErrand(selectedResolution, closingMessage)
                  .then(closeModal)
                  .catch(() => showCloseErrorToast());
              }}
            >
              Avsluta
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
};
