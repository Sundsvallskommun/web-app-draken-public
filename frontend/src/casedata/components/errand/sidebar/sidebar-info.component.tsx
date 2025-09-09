import { SaveButtonComponent } from '@casedata/components/save-button/save-button.component';
import { SuspendErrandComponent } from '@casedata/components/suspend-errand';
import useDisplayPhasePoller from '@casedata/hooks/displayPhasePoller';
import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { CreateErrandNoteDto } from '@casedata/interfaces/errandNote';
import { saveErrandNote } from '@casedata/services/casedata-errand-notes-service';
import {
  cancelErrandPhaseChange,
  getErrand,
  isErrandAdmin,
  isErrandLocked,
  phaseChangeInProgress,
  validateAction,
} from '@casedata/services/casedata-errand-service';
import { setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { isAppealEnabled } from '@common/services/feature-flag-service';
import { Admin } from '@common/services/user-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Dialog,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Label,
  Select,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { AppealButtonComponent } from '../appeal-button.component';
import { PhaseChanger } from '../phasechanger/phasechanger.component';
import { MessageComposer } from '../tabs/messages/message-composer.component';
import { ResumeErrandButton } from './resume-errand-button.component';

export const SidebarInfo: React.FC<{}> = () => {
  const {
    municipalityId,
    user,
    errand,
    setErrand,
    administrators,
    uiPhase,
  }: { municipalityId: string; user: any; errand: IErrand; setErrand: any; administrators: Admin[]; uiPhase: UiPhase } =
    useAppContext();
  const [selectableStatuses, setSelectableStatuses] = useState<string[]>([]);
  const [showMessageComposer, setShowMessageComposer] = useState<boolean>(false);
  const [dialogIsOpen, setDialogIsOpen] = useState<boolean>(false);
  const [causeIsEmpty, setCauseIsEmpty] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const toastMessage = useSnackbar();
  const { pollDisplayPhase } = useDisplayPhasePoller();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const { setValue, register, getValues, reset }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (administrators && errand?.administrator?.adAccount) {
      const match =
        administrators.filter((a) => {
          return a.adAccount === errand.administrator.adAccount;
        })?.[0]?.displayName || '';
      setValue('administratorName', match);
    } else {
      setValue('administratorName', 'Välj handläggare');
    }
    if (errand?.id && errand?.status?.statusType) {
      setValue('status.statusType', errand.status?.statusType);
    } else {
      setValue('status.statusType', 'Välj status');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, administrators]);

  useEffect(() => {
    const s = [ErrandStatus.VantarPaKomplettering, ErrandStatus.InterntAterkoppling, ErrandStatus.Tilldelat];
    if (errand?.phase === ErrandPhase.aktualisering) {
      s.unshift(ErrandStatus.ArendeInkommit);
    }
    if (uiPhase === UiPhase.granskning) {
      if (s.includes(ErrandStatus.ArendeInkommit)) {
        s.splice(s.indexOf(ErrandStatus.ArendeInkommit), 1);
      }
      s.push(ErrandStatus.UnderGranskning);
    }
    if (errand?.phase === ErrandPhase.utredning) {
      s.push(ErrandStatus.UnderUtredning);
    }
    if (errand?.phase === ErrandPhase.beslut) {
      s.push(ErrandStatus.UnderBeslut);
    }
    if (!s.includes(errand.status?.statusType as ErrandStatus)) {
      s.unshift(errand.status?.statusType as ErrandStatus);
    }
    setSelectableStatuses(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const errandSave = useSaveCasedataErrand(false);
  const selfAssignErrand = async () => {
    setLoading(true);
    try {
      await errandSave();
      const admin = administrators.find((a) => a.adAccount === user.username);
      if (admin) {
        await setAdministrator(municipalityId, errand, admin);
        toastMessage(
          getToastOptions({
            message: 'Handläggare sparades',
            status: 'success',
          })
        );
      }
      const updated = await getErrand(municipalityId, errand.id.toString());
      setErrand(updated.errand);
      reset();
      pollDisplayPhase();
    } catch (e) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när handläggaren sparades',
        status: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const exitErrand = () => {
    let createNote = true;

    const publicNoteValue = getValues('publicNote');

    if (publicNoteValue?.length === 0 || typeof publicNoteValue === undefined) {
      createNote = false;
      setCauseIsEmpty(true);
    }

    if (!isErrandAdmin(errand, user)) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: `Du är inte handläggare på detta ärende.`,
        status: 'error',
      });
      createNote = false;
    } else if (uiPhase === UiPhase.registrerad) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: `Ärendet är inte under granskning.`,
        status: 'error',
      });
      createNote = false;
    }

    if (createNote && typeof publicNoteValue === 'string' && publicNoteValue?.length > 0) {
      const newNote: CreateErrandNoteDto = {
        title: '',
        text: publicNoteValue,
        noteType: 'PUBLIC',
        extraParameters: {},
      };
      return saveErrandNote(municipalityId, errand.id?.toString(), newNote)
        .then(() => {
          toastMessage(
            getToastOptions({
              message: `Tjänsteanteckningen sparades`,
              status: 'success',
            })
          );

          cancelErrandPhaseChange(municipalityId, errand)
            .then(() => {
              toastMessage(
                getToastOptions({
                  message: 'Ärendet avslutades',
                  status: 'success',
                })
              );
              setDialogIsOpen(false);

              //TODO add polling.
              getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
              reset();
              pollDisplayPhase();
            })
            .catch(() => {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Ärendet kunde inte avslutas',
                status: 'error',
              });
            });

          setValue('publicNote', '');
        })
        .catch((e) => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när tjänsteanteckningen sparades`,
            status: 'error',
          });
          createNote = false;
        });
    }
  };

  return (
    <>
      <div className="relative h-full flex flex-col justify-start">
        <div className="px-0 flex justify-between items-center">
          <span className="text-base md:text-large xl:text-lead font-semibold">Handläggning</span>
        </div>

        {errand?.id ? (
          <div className="w-full mt-md flex flex-col items-start gap-12">
            <FormControl id="administrator" className="w-full" required disabled={isErrandLocked(errand)}>
              <div className="flex justify-between">
                <FormLabel className="flex justify-between text-small">Ansvarig</FormLabel>
                <Button
                  variant="link"
                  className="font-normal text-small"
                  size="sm"
                  disabled={errand?.administrator?.adAccount === user.username}
                  onClick={() => {
                    selfAssignErrand();
                  }}
                >
                  Ta ärende
                </Button>
              </div>
              <Select
                className="w-full"
                size="sm"
                data-cy="admin-input"
                placeholder="Tilldela handläggare"
                aria-label="Tilldela handläggare"
                {...register('administratorName')}
                value={getValues().administratorName}
              >
                {!errand?.administrator?.adAccount ? <Select.Option>Tilldela handläggare</Select.Option> : null}
                {administrators
                  .sort((a, b) => (a.lastName > b.lastName ? 1 : -1))
                  .map((a) => (
                    <Select.Option key={a.adAccount}>{a.displayName}</Select.Option>
                  ))}
              </Select>
            </FormControl>
            <FormControl
              id="status"
              className="w-full"
              required
              disabled={
                isErrandLocked(errand) ||
                errand.status?.statusType === ErrandStatus.Beslutad ||
                errand.phase === ErrandPhase.uppfoljning ||
                !allowed ||
                !errand.administrator
              }
            >
              <FormLabel className="text-small">Ärendestatus</FormLabel>
              <Select
                className="w-full"
                size="sm"
                data-cy="status-input"
                placeholder="Välj status"
                aria-label="Välj status"
                {...register('status.statusType')}
                value={getValues().status?.statusType}
              >
                {!errand?.status ? <Select.Option>Välj status</Select.Option> : null}
                {selectableStatuses.map((c: string, index) => (
                  <Select.Option value={c} key={c}>
                    {c}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
            <SaveButtonComponent
              setUnsaved={() => {}}
              update={() => {}}
              label="Spara ärende"
              color="primary"
              loading={loading}
            />
          </div>
        ) : null}

        <Divider className="my-20"></Divider>

        {errand?.status?.statusType === ErrandStatus.Parkerad ||
        errand?.status?.statusType === ErrandStatus.Tilldelat ? (
          <>
            <div className="flex">
              <Label>
                <LucideIcon size="1.5rem" name="circle-pause" />{' '}
                {errand?.status?.statusType === ErrandStatus.Parkerad ? 'Parkerat ' : 'Tilldelat '}
              </Label>
              <p className="text-small ml-8">{dayjs(errand.suspension?.suspendedFrom).format('DD MMM, HH:mm')}</p>
            </div>
            <p className="text-small">
              {getValues('administratorName') === 'Välj handläggare' ? (
                <span className="mb-24">Ärendet parkerades utan en handläggare.</span>
              ) : (
                <span className="mb-24">
                  <strong>{getValues('administratorName')}</strong>
                  {errand?.status?.statusType === ErrandStatus.Parkerad
                    ? ' parkerade ärendet med en påminnelse '
                    : ' tilldelades ärendet'}{' '}
                  {errand.suspension?.suspendedTo
                    ? dayjs(errand.suspension.suspendedTo).format('DD MMM, HH:mm')
                    : errand?.status?.statusType === ErrandStatus.Parkerad && '(datum saknas)'}
                </span>
              )}
            </p>
            <ResumeErrandButton disabled={!isErrandAdmin(errand, user)} />
          </>
        ) : (
          <>
            {errand?.status?.statusType === ErrandStatus.InterntAterkoppling ||
            errand?.status?.statusType === ErrandStatus.VantarPaKomplettering ? (
              <ResumeErrandButton disabled={!isErrandAdmin(errand, user)} />
            ) : (
              <PhaseChanger />
            )}
            {uiPhase !== UiPhase.registrerad && (
              <Button
                leftIcon={<LucideIcon name="mail" />}
                className="w-full mt-16"
                color="vattjom"
                data-cy="new-message-button"
                variant="secondary"
                disabled={isErrandLocked(errand) || !allowed}
                onClick={() => {
                  setShowMessageComposer(true);
                }}
              >
                Nytt meddelande
              </Button>
            )}
            <SuspendErrandComponent disabled={false} />
          </>
        )}
        {isAppealEnabled() ? (
          <AppealButtonComponent
            disabled={
              !isErrandAdmin(errand, user) ||
              phaseChangeInProgress(errand) ||
              errand?.status?.statusType === ErrandStatus.UnderGranskning ||
              errand?.status?.statusType === ErrandStatus.UnderUtredning
            }
          />
        ) : null}

        {uiPhase !== UiPhase.slutfor &&
          errand.phase !== ErrandPhase.verkstalla &&
          errand.phase !== ErrandPhase.uppfoljning &&
          errand?.status?.statusType !== ErrandStatus.Tilldelat && (
            <>
              <Button
                className="mt-16"
                color="primary"
                variant="secondary"
                onClick={() => {
                  setDialogIsOpen(true);
                  setCauseIsEmpty(false);
                }}
                disabled={
                  !(
                    uiPhase === UiPhase.granskning ||
                    uiPhase === UiPhase.utredning ||
                    uiPhase === UiPhase.beslut ||
                    uiPhase === UiPhase.uppfoljning
                  ) ||
                  !isErrandAdmin(errand, user) ||
                  isErrandLocked(errand)
                }
              >
                Avsluta ärendet
              </Button>
            </>
          )}
        <Dialog show={dialogIsOpen} className="w-[36rem]">
          <Dialog.Content className="flex flex-col items-center text-center">
            <LucideIcon name="archive-x" color="vattjom" size={32} />

            <h1 className="text-h3-md">Avsluta ärendet?</h1>
            <FormLabel>
              Beskriv orsak till avslut<span aria-hidden="true">*</span>
            </FormLabel>
            <Textarea className="w-full" rows={4} {...register('publicNote')} />
            {causeIsEmpty ? (
              <div className="my-sm text-error">
                <FormErrorMessage>Orsak till avslut måste anges.</FormErrorMessage>
              </div>
            ) : null}
            <small className="my-0 text-dark-secondary">Texten sparas som en tjänsteanteckning på ärendet.</small>
            <p>Du kommer nu att avsluta ärendet innan hela processen är komplett. Är du säker att du vill avsluta?</p>
          </Dialog.Content>
          <Dialog.Buttons className="flex justify-center">
            <Button className="w-[12.8rem]" variant="secondary" onClick={() => setDialogIsOpen(false)}>
              Nej
            </Button>
            <Button className="w-[12.8rem]" variant="primary" onClick={() => exitErrand()}>
              Ja
            </Button>
          </Dialog.Buttons>
        </Dialog>
      </div>
      <MessageComposer
        show={showMessageComposer}
        closeHandler={() => {
          setTimeout(() => {
            setShowMessageComposer(false);
          }, 0);
        }}
        setUnsaved={() => {}}
        update={() =>
          setTimeout(() => {
            getErrand(municipalityId, errand.id.toString()).then((res) => {
              setErrand(res.errand);
              return res;
            });
          }, 500)
        }
      />
    </>
  );
};
