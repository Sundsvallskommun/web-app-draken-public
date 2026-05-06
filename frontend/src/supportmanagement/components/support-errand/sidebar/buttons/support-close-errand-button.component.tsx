import { isIK, isKA, isLOP, isROB, isSE } from '@common/services/application-service';
import { deepFlattenToObject } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import { Button, Checkbox, Divider, FormControl, Modal, RadioButton, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import {
  closeSupportErrand,
  getSupportErrandById,
  Resolution,
  ResolutionLabelIK,
  ResolutionLabelKA,
  ResolutionLabelKS,
  ResolutionLabelLOP,
  ResolutionLabelROB,
  setSupportErrandStatus,
  Status,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { sendClosingMessage } from '@supportmanagement/services/support-message-service';
import { applicantHasContactChannel, getAdminName } from '@supportmanagement/services/support-stakeholder-service';
import { ArrowLeft, Check } from 'lucide-react';
import React, { useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

const RESOLUTION_DESCRIPTION =
  'Du kan avsluta ärendet med nuvarande lösningskod, eller ändra om något i ärendet har påverkat lösningen.';

const getResolutionLabels = (): Record<string, string> => {
  if (isLOP()) return ResolutionLabelLOP;
  if (isIK() || isSE()) return ResolutionLabelIK;
  if (isKA()) return ResolutionLabelKA;
  if (isROB()) return ResolutionLabelROB;
  return ResolutionLabelKS;
};

const getDefaultResolution = (errand: SupportErrand | undefined): Resolution => {
  if (!!errand?.resolution) return errand?.resolution as Resolution;

  return isROB()
    ? Resolution.NEED_MET
    : appConfig.features.useClosedAsDefaultResolution
    ? Resolution.CLOSED
    : Resolution.SOLVED;
};

export const SupportCloseErrandButtonComponent: React.FC<{ disabled: boolean }> = ({ disabled }) => {
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const toastMessage = useSnackbar();
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>(getDefaultResolution(supportErrand));

  const [closingMessage, setClosingMessage] = useState<boolean>(false);
  const [changeResolution, setChangeResolution] = useState<boolean>(false);

  const formControls: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

  const showCloseErrorToast = () => {
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: 'Något gick fel när ärendet skulle avslutas',
      status: 'error',
    });
  };

  const handleCloseErrand = (resolution: Resolution, msg: boolean) => {
    setIsLoading(true);
    return closeSupportErrand(supportErrand!.id!, municipalityId, resolution)
      .then(() => {
        if (msg) {
          const admin = administrators.find((a) => a.adAccount === supportErrand!.assignedUserId);
          const adminName = getAdminName(admin!);
          return sendClosingMessage(adminName, supportErrand!, municipalityId);
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
        getSupportErrandById(supportErrand!.id!, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch((e) => {
        showCloseErrorToast();
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
      <Modal
        show={showModal}
        label={
          Object.values(deepFlattenToObject(formControls.formState.dirtyFields)).some((v) => v) ? (
            'Du har osparade ändringar'
          ) : changeResolution ? (
            <div className="flex flex-row gap-8">
              <ArrowLeft size={24} onClick={() => setChangeResolution(false)} className="hover:cursor-pointer" />{' '}
              Avsluta ärendet
            </div>
          ) : (
            'Avsluta ärendet'
          )
        }
        className={!!supportErrand?.resolution && supportErrand?.resolution !== '' ? 'w-[67.2rem]' : 'w-[52rem]'}
        onClose={() => {
          setShowModal(false);
          setChangeResolution(false);
        }}
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
        ) : !!supportErrand?.resolution && supportErrand?.resolution !== '' && !changeResolution ? (
          <div>
            <span>{RESOLUTION_DESCRIPTION}</span>
            <div className="bg-vattjom-background-100 rounded-12 p-16 mt-24">
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-8">
                  <span>Nuvarande lösningskod</span>
                  <span className="font-bold">
                    {getResolutionLabels()[supportErrand?.resolution] || supportErrand?.resolution}
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setChangeResolution(true)}>
                  Ändra lösningskod
                </Button>
              </div>
            </div>
            <Button
              className="mt-32"
              variant="primary"
              color="vattjom"
              leftIcon={<Check />}
              onClick={async () => {
                try {
                  await setSupportErrandStatus(supportErrand.id ?? '', municipalityId, Status.SOLVED);
                  window.close();
                } catch (e) {
                  showCloseErrorToast();
                }
              }}
            >
              Avsluta
            </Button>
          </div>
        ) : (
          <>
            <Modal.Content>
              {changeResolution && <span className="pb-24">{RESOLUTION_DESCRIPTION}</span>}
              <p className="text-content font-semibold pb-24 ">
                {changeResolution ? 'Välj ny lösningskod' : 'Välj en lösningskod'}
              </p>

              <FormControl id="resolution" className="w-full" required>
                <RadioButton.Group data-cy="solve-radiolist">
                  {Object.entries(getResolutionLabels())
                    .filter(([_key, _label]) => _label !== 'Vidarebefordrat via växelprogrammet')
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([_key, _label], idx, arr) => (
                      <React.Fragment key={_key}>
                        <RadioButton
                          value={_key}
                          defaultChecked={_key === selectedResolution}
                          onClick={(e) => setSelectedResolution((e.target as HTMLInputElement).value as Resolution)}
                        >
                          {_label}
                        </RadioButton>
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
                  handleCloseErrand(selectedResolution, closingMessage).then(() => {
                    setShowModal(false);
                  });
                }}
              >
                Avsluta
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
};
