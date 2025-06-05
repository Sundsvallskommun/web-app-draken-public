import { SuspendErrandComponent } from '@casedata/components/suspend-errand';
import useDisplayPhasePoller from '@casedata/hooks/displayPhasePoller';
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
  setSuspendedErrands,
  triggerErrandPhaseChange,
  updateErrandStatus,
  validateAction,
} from '@casedata/services/casedata-errand-service';
import { setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { isAppealEnabled } from '@common/services/feature-flag-service';
import { sortBy } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Label,
  Modal,
  Select,
  Textarea,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import { AppealButtonComponent } from '../appeal-button.component';
import { PhaseChanger } from '../phasechanger/phasechanger.component';

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
  const [isLoading, setIsLoading] = useState<'status' | 'admin' | 'suspend' | false>();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const { pollDisplayPhase } = useDisplayPhasePoller();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState,
  }: UseFormReturn<{ admin: string; status: string; publicNote }, any, undefined> = useForm();

  useEffect(() => {
    if (administrators && errand?.administrator?.adAccount) {
      const match =
        administrators.filter((a) => {
          return a.adAccount === errand.administrator.adAccount;
        })?.[0]?.displayName || '';
      setValue('admin', match);
    } else {
      setValue('admin', 'Välj handläggare');
    }
    if (errand?.id && errand?.status?.statusType) {
      setValue('status', errand.status?.statusType);
    } else {
      setValue('status', 'Välj status');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, administrators]);

  useEffect(() => {
    const s = [ErrandStatus.VantarPaKomplettering, ErrandStatus.InterntAterkoppling, ErrandStatus.Tilldelat];
    if (errand?.phase === ErrandPhase.aktualisering) {
      s.unshift(ErrandStatus.ArendeInkommit);
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
  }, [errand]);

  const saveAdmin = () => {
    const admin = administrators.find((a) => a.displayName === getValues().admin);
    setIsLoading('admin');
    setError(false);
    return setAdministrator(municipalityId, errand, admin)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Handläggare sparades',
          status: 'success',
        });

        const status = Object.entries(ErrandStatus).find(([key, label]) => label === 'Tilldelat')[1];
        updateErrandStatus(municipalityId, errand.id.toString(), status).then(() => {
          setIsLoading(false);
          getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
          reset();
          pollDisplayPhase();
        });
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när handläggaren sparades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const selfAssignErrand = () => {
    const admin = administrators.find((a) => a.adAccount === user.username);
    setIsLoading('admin');
    setError(false);
    return setAdministrator(municipalityId, errand, admin)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Handläggare sparades',
          status: 'success',
        });
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        reset();
        pollDisplayPhase();
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när handläggaren sparades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const saveStatus = () => {
    const status = Object.entries(ErrandStatus).find(([key, label]) => label === getValues().status)[1];
    setIsLoading('status');
    setError(false);
    return updateErrandStatus(municipalityId, errand.id.toString(), status)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Status ändrades',
          status: 'success',
        });
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        reset();
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när status ändrades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const onError = () => {
    console.error('Something went wrong when saving');
  };

  const { admin } = watch();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const status = useMemo(() => getValues().status, [getValues()]);

  const [modalIsOpen, setModalIsOpen] = useState<boolean>(false);
  const [causeIsEmpty, setCauseIsEmpty] = useState<boolean>(false);

  const exitErrand = () => {
    let createNote = true;

    if (getValues('publicNote').length === 0) {
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

    if (createNote) {
      const newNote: CreateErrandNoteDto = {
        title: '',
        text: getValues('publicNote'),
        noteType: 'PUBLIC',
        extraParameters: {},
      };
      return saveErrandNote(municipalityId, errand.id?.toString(), newNote)
        .then(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Tjänsteanteckningen sparades`,
            status: 'success',
          });

          cancelErrandPhaseChange(municipalityId, errand)
            .then(() => {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Ärendet avslutades',
                status: 'success',
              });
              setModalIsOpen(false);

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

  const triggerPhaseChange = () => {
    return triggerErrandPhaseChange(municipalityId, errand)
      .then(() => getErrand(municipalityId, errand.id.toString()))
      .then((res) => setErrand(res.errand))
      .then(() => {
        setIsLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fasbytet inleddes',
          status: 'success',
        });
        setIsLoading(false);
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fasbytet inleddes',
          status: 'error',
        });
        setIsLoading(false);
      });
  };

  const activateErrand = () => {
    setIsLoading('suspend');
    setError(false);
    const previousStatus = sortBy(errand.statuses, 'created').reverse()[1].statusType;
    return setSuspendedErrands(
      errand.id,
      municipalityId,
      Object.values(ErrandStatus).find((status) => status === previousStatus),
      null,
      null
    )
      .then((res) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet återupptogs',
          status: 'success',
        });
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet skulle återupptas',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
      });
  };

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Information</span>
      </div>

      {!errand?.administrator?.adAccount ? (
        <div className="mt-md">
          {uiPhase === UiPhase.inkommet ? (
            <p>
              För att registrera ett ärende behöver du beskriva ärendet, lägga till en ärendeägare samt addera uppgifter
              som kan vara viktiga för en handläggare att ta del av.
            </p>
          ) : UiPhase.granskning ? (
            <p>
              För att inleda utredning behöver ärendet tilldelas en ansvarig handläggare. Du kan utse dig själv eller
              någon annan i ditt team.
            </p>
          ) : (
            <p>
              Ärendet behöver tilldelas en ansvarig handläggare. Du kan utse dig själv eller någon annan i ditt team.
            </p>
          )}
        </div>
      ) : null}
      {errand?.id ? (
        <div className="w-full mt-md flex flex-col items-start gap-12">
          <FormControl id="administrator" className="w-full" required disabled={isErrandLocked(errand)}>
            <div className="flex justify-between">
              <FormLabel className="flex justify-between text-small">Ansvarig handläggare</FormLabel>
              <Button
                variant="link"
                className="font-normal"
                size="sm"
                disabled={errand?.administrator?.adAccount === user.username}
                onClick={() => {
                  confirm
                    .showConfirmation('Ta ärende', 'Vill du tilldela dig själv ärendet?', 'Ja', 'Nej', 'info', 'info')
                    .then((confirmed) => {
                      if (confirmed) {
                        selfAssignErrand();
                      }
                    });
                }}
              >
                Ta ärende
              </Button>
            </div>
            <Select
              className="w-full"
              size="sm"
              data-cy="admin-input"
              placeholder="Välj handläggare"
              aria-label="Välj handläggare"
              {...register('admin')}
              value={admin}
            >
              {!errand?.administrator?.adAccount ? <Select.Option>Välj handläggare</Select.Option> : null}
              {administrators
                .sort((a, b) => (a.lastName > b.lastName ? 1 : -1))
                .map((a) => (
                  <Select.Option key={a.adAccount}>{a.displayName}</Select.Option>
                ))}
            </Select>
          </FormControl>
          {errand?.id && formState.dirtyFields.admin && admin !== 'Välj handläggare' ? (
            <Button
              color="primary"
              disabled={
                !errand?.id || !formState.dirtyFields.admin || admin === 'Välj handläggare' || isErrandLocked(errand)
              }
              loadingText="Sparar"
              loading={isLoading === 'admin'}
              size="sm"
              onClick={handleSubmit(saveAdmin, onError)}
              data-cy="assign-administrator-button"
            >
              Tilldela
            </Button>
          ) : null}
          <FormControl
            id="status"
            className="w-full"
            required
            disabled={
              isErrandLocked(errand) ||
              errand.status?.statusType === ErrandStatus.Beslutad ||
              errand.phase === ErrandPhase.uppfoljning ||
              !allowed
            }
          >
            <FormLabel>Ärendestatus</FormLabel>
            <Select
              className="w-full"
              size="sm"
              data-cy="status-input"
              placeholder="Välj status"
              aria-label="Välj status"
              {...register('status')}
              value={status}
            >
              {!errand?.status ? <Select.Option>Välj status</Select.Option> : null}
              {selectableStatuses.map((c: string, index) => (
                <Select.Option value={c} key={c}>
                  {c}
                </Select.Option>
              ))}
            </Select>
          </FormControl>
          {errand?.id && formState.dirtyFields.status && getValues().status !== 'Välj status' ? (
            <Button
              color="primary"
              disabled={
                !errand?.id ||
                !formState.dirtyFields.status ||
                getValues().status === 'Välj status' ||
                isErrandLocked(errand) ||
                !allowed
              }
              loadingText="Sparar"
              loading={isLoading === 'status'}
              size="sm"
              onClick={handleSubmit(saveStatus, onError)}
              data-cy="save-status-button"
            >
              Spara
            </Button>
          ) : null}
        </div>
      ) : null}

      <Divider className="my-20"></Divider>

      {errand?.status?.statusType !== ErrandStatus.Parkerad ? (
        <>
          <PhaseChanger />
          {<SuspendErrandComponent disabled={false} />}
        </>
      ) : (
        errand?.status?.statusType === ErrandStatus.Parkerad && (
          <>
            <div className="flex">
              <Label>
                <LucideIcon size="1.5rem" name="circle-pause" />{' '}
                {errand?.status?.statusType === ErrandStatus.Parkerad ? 'Parkerat ' : 'Tilldelat '}
              </Label>
              <p className="text-small ml-8">{dayjs(errand.suspension?.suspendedFrom).format('DD MMM, HH:mm')}</p>
            </div>
            <p className="text-small">
              {getValues('admin') === 'Välj handläggare' ? (
                <span className="mb-24">Ärendet parkerades utan en handläggare.</span>
              ) : (
                <span className="mb-24">
                  <strong>{getValues('admin')}</strong>
                  {errand?.status?.statusType === ErrandStatus.Parkerad
                    ? ' parkerade ärendet med en påminnelse '
                    : ' tilldelades ärendet'}{' '}
                  {errand.suspension.suspendedTo !== null
                    ? dayjs(errand.suspension.suspendedTo).format('DD MMM, HH:mm')
                    : errand?.status?.statusType === ErrandStatus.Parkerad && '(datum saknas)'}
                </span>
              )}
            </p>

            <Button
              className="mt-16"
              color="vattjom"
              data-cy="suspend-button"
              leftIcon={<LucideIcon name="circle-play" />}
              variant="secondary"
              disabled={!allowed}
              loading={isLoading === 'status'}
              loadingText="Återupptar"
              onClick={() => {
                confirm
                  .showConfirmation('Återuppta ärende', 'Vill du återuppta ärendet?', 'Ja', 'Nej', 'info', 'info')
                  .then((confirmed) => {
                    if (confirmed) {
                      activateErrand();
                    }
                  });
              }}
            >
              Återuppta ärende
            </Button>
          </>
        )
      )}
      {isAppealEnabled() ? (
        <AppealButtonComponent disabled={!isErrandAdmin(errand, user) || phaseChangeInProgress(errand)} />
      ) : null}

      {uiPhase !== UiPhase.slutfor &&
        errand.phase !== ErrandPhase.verkstalla &&
        errand.phase !== ErrandPhase.uppfoljning && (
          <>
            <Button
              className="mt-16"
              color="primary"
              variant="secondary"
              onClick={() => {
                setModalIsOpen(true);
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

      <Modal
        label="Avsluta ärendet"
        show={modalIsOpen}
        onClose={() => {
          setModalIsOpen(false);
        }}
        className="min-w-[48rem]"
      >
        <Modal.Content className="pb-0">
          <FormControl className="w-full">
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
          </FormControl>
        </Modal.Content>
        <Modal.Footer>
          <Button
            variant="primary"
            color="vattjom"
            className="w-full mt-8"
            disabled={
              !(uiPhase === UiPhase.granskning || uiPhase === UiPhase.utredning || uiPhase === UiPhase.beslut) ||
              isErrandLocked(errand) ||
              !isErrandAdmin(errand, user)
            }
            onClick={() => {
              exitErrand();
            }}
          >
            Avsluta ärendet
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
