import { useAppContext } from '@common/contexts/app.context';
import { isROB } from '@common/services/application-service';
import { deepFlattenToObject } from '@common/services/helper-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, FormControl, FormLabel, Label, Select, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { Priority } from '@supportmanagement/interfaces/priority';
import {
  Resolution,
  Status,
  StatusLabel,
  StatusLabelROB,
  defaultSupportErrandInformation,
  getSupportErrandById,
  isSupportErrandLocked,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  setSuspension,
  supportErrandIsEmpty,
  updateSupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { saveFacilityInfo } from '@supportmanagement/services/support-facilities';
import dayjs from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { CloseErrandComponent } from './close-errand.component';
import { ForwardErrandComponent } from './forward-errand.component';
import { StartProcessComponent } from './start-process.component';
import { SupportResumeErrandButton } from './support-resume-errand-button.component';
import { SuspendErrandComponent } from './suspend-errand.component';

export const SidebarInfo: React.FC<{}> = () => {
  const {
    user,
    supportErrand,
    setSupportErrand,
    administrators,
    municipalityId,
    unsavedFacility,
    setUnsavedFacility,
    setUnsavedChanges,
  } = useAppContext();
  const [selectableStatuses, setSelectableStatuses] = useState<{ key: string; label: string }[]>([]);
  const [selectablePriorities, setSelectablePriorities] = useState<{ key: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState<'status' | 'admin' | 'priority' | 'suspend' | false | true>();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!supportErrandIsEmpty(supportErrand)) {
      let _a = validateAction(supportErrand, user);
      if (supportErrand.assignedUserId?.toLocaleLowerCase() === undefined) {
        if (
          supportErrand.channel === 'EMAIL' ||
          supportErrand.channel === 'ESERVICE' ||
          supportErrand.channel === 'ESERVICE_INTERNAL'
        ) {
          _a = true;
        }
      }
      setAllowed(_a);
    } else {
      setAllowed(isAdmin());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, supportErrand]);

  const toast = (kind, label) =>
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: label,
      status: kind,
    });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    formState: { errors },
  }: UseFormReturn<
    Partial<RegisterSupportErrandFormModel> & any & { admin: string; status: any; priority: any },
    any,
    undefined
  > = useFormContext();

  const formIsNotValid = useMemo(() => !formState.isValid, [formState.isValid]);

  const { admin, status, priority } = watch();

  const update = () => {
    if (supportErrand.id) {
      getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
    }
  };

  const onSubmit = () => {
    setError(false);
    setIsLoading(true);

    const municipalityId = defaultSupportErrandInformation.municipalityId;

    return updateSupportErrand(municipalityId, getValues())
      .then((res) => {
        setIsLoading(false);
        if (
          supportErrand?.assignedUserId !== administrators.find((a) => a.displayName === getValues().admin)?.adAccount
        ) {
          saveAdmin();
        } else if (supportErrand.status !== getValues().status) {
          updateSupportErrandStatus(getValues().status);
        }

        if (unsavedFacility) {
          saveFacilityInfo(supportErrand.id, getValues().facilities)
            .then(() => {
              setUnsavedFacility(false);
              setIsLoading(false);
            })
            .catch(() => {
              setIsLoading(false);
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Något gick fel när fastigheter i ärendet sparades',
                status: 'error',
              });
              return true;
            });
        }
        update();
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet uppdaterades',
          status: 'success',
        });
        setTimeout(async () => {
          const e = await getSupportErrandById(getValues().id, municipalityId);
          setSupportErrand(e.errand);
          reset(e.errand);
        }, 0);
        setUnsavedChanges(false);
        return res;
      })
      .catch((e) => {
        console.error('Error when updating errand:', e);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet uppdaterades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return true;
      });
  };

  const saveAdmin = () => {
    const admin = administrators.find((a) => a.displayName === getValues().admin);
    const assigner = administrators.find((a) => a.adAccount === user.username);

    setIsLoading('admin');
    setError(false);
    return handleAction(
      async () => {
        if (admin.adAccount === assigner.adAccount) {
          await setSupportErrandAdmin(
            supportErrand.id,
            municipalityId,
            admin?.adAccount,
            Status.ONGOING,
            assigner.adAccount
          );
        } else {
          await setSupportErrandAdmin(
            supportErrand.id,
            municipalityId,
            admin?.adAccount,
            Status.ASSIGNED,
            assigner.adAccount
          );
        }

        return true;
      },
      () => toast('success', 'Handläggare tilldelades'),
      () => toast('error', 'Något gick fel när handläggare tilldelades')
    );
  };

  useEffect(() => {
    if (administrators && supportErrand?.assignedUserId) {
      const match =
        administrators.filter((a) => {
          return a.adAccount === supportErrand.assignedUserId;
        })?.[0]?.displayName || '';
      setValue('admin', match);
    } else {
      setValue('admin', 'Välj handläggare');
    }

    if (supportErrand?.status) {
      setValue('status', supportErrand.status);
    } else {
      setValue('status', 'Välj status');
    }

    if (supportErrand?.priority) {
      setValue('priority', supportErrand.priority);
    } else {
      setValue('priority', 'Välj prioritet');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportErrand, administrators]);

  useEffect(() => {
    if (supportErrand?.priority && supportErrand?.status) {
      const statusLabel = isROB() ? StatusLabelROB : StatusLabel;
      const statuses = Object.keys(statusLabel).map((key) => {
        return {
          key: key,
          label: statusLabel[key],
        };
      });

      setSelectableStatuses(statuses);

      const prio = [
        { key: 'LOW', label: Priority.LOW },
        { key: 'MEDIUM', label: Priority.MEDIUM },
        { key: 'HIGH', label: Priority.HIGH },
      ];
      setSelectablePriorities(prio);
    }
  }, [supportErrand]);

  const handleAction = (action: () => Promise<boolean>, success: () => void, fail: () => void) => {
    return action()
      .then(() => {
        success();
        setIsLoading(false);
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
        reset();
      })
      .catch(() => {
        fail();
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const updateSupportErrandStatus = (status: Status) => {
    setIsLoading('status');
    setError(false);
    return handleAction(
      () => setSupportErrandStatus(supportErrand.id, municipalityId, status),
      () => toast('success', 'Status ändrades'),
      () => toast('error', 'Något gick fel när status ändrades')
    );
  };

  const activateErrand = () => {
    setIsLoading('suspend');
    setError(false);
    return handleAction(
      () => setSuspension(supportErrand.id, municipalityId, Status.ONGOING, null, null),
      () => toast('success', 'Ärende återupptogs'),
      () => toast('error', 'Något gick fel när ärendet återupptogs')
    );
  };

  const selfAssignSupportErrand = () => {
    const admin = administrators.find((a) => a.adAccount === user.username);
    if (admin) {
      setIsLoading('admin');
      setError(false);
      return handleAction(
        () =>
          setSupportErrandAdmin(supportErrand.id, municipalityId, admin?.adAccount, Status.ONGOING, admin?.adAccount),
        () => toast('success', 'Handläggare tilldelades'),
        () => toast('error', 'Något gick fel när handläggare tilldelades')
      );
    } else {
      toast('error', 'Något gick fel');
    }
  };

  const isAdmin = () => {
    return administrators.some((a) => a.adAccount === user.username);
  };

  const solutionComponent = (label, info, icon) => (
    <>
      <div className="flex">
        <Label rounded>
          <LucideIcon size="1.5rem" name={icon} /> {label}
        </Label>{' '}
        <p className="text-small ml-8">{dayjs(supportErrand.modified).format('DD MMM, HH:mm')}</p>
      </div>
      <p className="text-small">
        <strong>{getValues('admin')}</strong> {info}
      </p>
    </>
  );

  const renderLabelSwitch = (resolution: string) => {
    switch (resolution) {
      case Resolution.SOLVED: {
        return solutionComponent('Löst', 'avslutade ärendet.', 'check');
      }
      case Resolution.REFERRED_VIA_EXCHANGE: {
        return solutionComponent('Löst', 'löste ärendet via växelsystemet.', 'split');
      }
      case Resolution.CONNECTED: {
        return solutionComponent('Löst', 'avslutade ärendet genom att koppla.', 'check');
      }
      case Resolution.REGISTERED_EXTERNAL_SYSTEM: {
        return solutionComponent('Överlämnat', 'överlämnade ärendet.', 'split');
      }
      case Resolution.SELF_SERVICE: {
        return solutionComponent('Löst', 'hänvisade till självservice.', 'check');
      }
      case Resolution.INTERNAL_SERVICE: {
        return solutionComponent('Löst', 'hänvisade till intern service.', 'check');
      }
      case Resolution.CLOSED: {
        return solutionComponent('Avslutat', 'avslutade ärendet.', 'check');
      }
      case Resolution.BACK_TO_MANAGER: {
        return solutionComponent('Åter till chef', 'avslutade ärendet.', 'redo');
      }
      case Resolution.BACK_TO_HR: {
        return solutionComponent('Åter till HR', 'avslutade ärendet.', 'redo');
      }
      case Resolution.REFER_TO_CONTACTSUNDSVALL: {
        return solutionComponent('Hänvisat', 'hänvisade till Kontakt Sundsvall.', 'check');
      }
      case Resolution.REFER_TO_PHONE: {
        return solutionComponent('Hänvisat', 'hänvisade till telefontid.', 'check');
      }
      case Resolution.REGISTERED: {
        return solutionComponent('Registrerat', 'registrerade ärendet.', 'check');
      }
      case Resolution.SENT_MESSAGE: {
        return solutionComponent('Meddelande', 'skickade ett meddelande.', 'check');
      }
      case Resolution.NEED_MET: {
        return solutionComponent('Behov uppfyllt', 'avslutade ärendet.', 'check');
      }
      case Resolution.RECRUITED_FEWER: {
        return solutionComponent('Rekryterat färre', 'avslutade ärendet.', 'check');
      }
      case Resolution.RECRUITED_MORE: {
        return solutionComponent('Rekryterat fler', 'avslutade ärendet.', 'check');
      }
      case Resolution.CANCELLED: {
        return solutionComponent('Avbruten', 'avslutade ärendet.', 'check');
      }
      case Resolution.SUB_PACKAGE_READY: {
        return solutionComponent('Delpaket klart', 'avslutade ärendet.', 'check');
      }
    }
  };

  const messageSidebarIsDisabled =
    !supportErrand ||
    isSupportErrandLocked(supportErrand) ||
    !allowed ||
    [Status.NEW, Status.SUSPENDED, Status.ASSIGNED, Status.SOLVED].includes(supportErrand.status as Status);

  const onError = () => {
    console.error('Something went wrong when saving');
  };

  const hasClosedErrandPassedLimit = () => {
    const limit = process.env.NEXT_PUBLIC_REOPEN_SUPPORT_ERRAND_LIMIT;
    const lastModified = dayjs(supportErrand.modified);
    return dayjs().isAfter(lastModified.add(parseInt(limit), 'day'));
  };

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Handläggning</span>
      </div>

      <div className="w-full mt-md flex flex-col gap-12">
        <>
          <FormControl id="administrator" className="w-full">
            <FormLabel className="flex justify-between text-small">
              Ansvarig{' '}
              <Button
                variant="link"
                className="font-normal"
                size="sm"
                disabled={
                  supportErrandIsEmpty(supportErrand) || !isAdmin() || supportErrand?.assignedUserId === user.username
                }
                onClick={() => {
                  selfAssignSupportErrand();
                }}
                data-cy="self-assign-errand-button"
              >
                Ta ärende
              </Button>
            </FormLabel>
            <Select
              // disabled={supportErrandIsEmpty(supportErrand)}
              className="w-full"
              size="sm"
              data-cy="admin-input"
              placeholder="Tilldela handläggare"
              aria-label="Tilldela handläggare"
              {...register('admin')}
              value={admin}
            >
              {!supportErrand?.assignedUserId ? <Select.Option>Tilldela handläggare</Select.Option> : null}
              {administrators
                .sort((a, b) => (a.lastName > b.lastName ? 1 : -1))
                .map((a) => (
                  <Select.Option key={a.adAccount}>
                    {/* TODO Avatar */} {a.displayName}
                  </Select.Option>
                ))}
            </Select>
          </FormControl>

          <FormControl id="status" className="w-full" disabled={!allowed}>
            <FormLabel className="text-small">Ärendestatus</FormLabel>
            <Select
              className="w-full"
              size="sm"
              data-cy="status-input"
              placeholder="Välj status"
              aria-label="Välj status"
              {...register('status')}
              value={status}
              disabled={
                supportErrand?.status === Status.SOLVED ||
                (!supportErrandIsEmpty(supportErrand) && !supportErrand?.assignedUserId)
              }
            >
              {!supportErrand?.status ? <Select.Option>Välj status</Select.Option> : null}
              {selectableStatuses.map((c: { key: string; label: string }, index) => (
                <Select.Option value={c.key} key={`${c}-${index}`}>
                  {c.label}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {supportErrand?.status !== Status.SOLVED && (
            <FormControl id="priority" className="w-full" disabled={!allowed}>
              <FormLabel className="text-small">Prioritet</FormLabel>
              <Select
                className="w-full"
                size="sm"
                data-cy="priority-input"
                placeholder="Välj prioritet"
                aria-label="Välj prioritet"
                {...register('priority')}
                value={priority}
                disabled={!supportErrandIsEmpty(supportErrand) && !supportErrand?.assignedUserId}
              >
                {!supportErrand?.priority ? <Select.Option>Välj prioritet</Select.Option> : null}
                {selectablePriorities.map((c: { key: string; label: string }, index) => (
                  <Select.Option value={c.key} key={`${c}-${index}`}>
                    {c.label}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          )}
        </>

        <div className="w-full">
          <Button
            className="w-full my-8"
            data-cy="save-button"
            type="button"
            disabled={
              isSupportErrandLocked(supportErrand) ||
              !Object.values(deepFlattenToObject(formState.dirtyFields)).some((v) => v) ||
              formIsNotValid
            }
            onClick={handleSubmit(() => {
              return onSubmit();
            }, onError)}
            variant="primary"
            color="primary"
            loading={isLoading === true}
            loadingText="Sparar"
          >
            Spara ärende
          </Button>
          <>
            <Divider className="mt-16 mb-24" />

            {supportErrand?.status === Status.SOLVED ? (
              <>
                {renderLabelSwitch(supportErrand.resolution)}
                <Button
                  className="w-full mt-20"
                  color="vattjom"
                  leftIcon={<LucideIcon name="undo-2" />}
                  variant="secondary"
                  onClick={() => {
                    confirm
                      .showConfirmation('Återöppna ärende', 'Vill du återöppna ärendet?', 'Ja', 'Nej', 'info', 'info')
                      .then((confirmed) => {
                        if (confirmed) {
                          updateSupportErrandStatus(Status.ONGOING);
                        }
                      });
                  }}
                  disabled={hasClosedErrandPassedLimit()}
                >
                  Återöppna ärende
                </Button>
              </>
            ) : supportErrand?.status === Status.SUSPENDED || supportErrand?.status === Status.ASSIGNED ? (
              <>
                <div className="flex">
                  <Label>
                    <LucideIcon size="1.5rem" name="circle-pause" />{' '}
                    {supportErrand?.status === Status.SUSPENDED ? 'Parkerat ' : 'Tilldelat '}
                  </Label>
                  <p className="text-small ml-8">{dayjs(supportErrand.modified).format('DD MMM, HH:mm')}</p>
                </div>
                <p className="text-small">
                  {getValues('admin') === 'Välj handläggare' ? (
                    <span className="mb-24">Ärendet parkerades utan en handläggare.</span>
                  ) : (
                    <span className="mb-24">
                      <strong>{getValues('admin')}</strong>
                      {supportErrand?.status === Status.SUSPENDED
                        ? ' parkerade ärendet med en påminnelse '
                        : ' tilldelades ärendet'}{' '}
                      {supportErrand.suspension?.suspendedTo
                        ? dayjs(supportErrand.suspension?.suspendedTo).format('DD MMM, HH:mm')
                        : supportErrand?.status === Status.SUSPENDED && '(datum saknas)'}
                    </span>
                  )}
                </p>

                <SupportResumeErrandButton disabled={!allowed} />
              </>
            ) : (
              <div className="flex flex-col gap-8">
                {allowed && !supportErrandIsEmpty(supportErrand) && (
                  <>
                    <SupportResumeErrandButton disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
                    <StartProcessComponent
                      disabled={!allowed || supportErrandIsEmpty(supportErrand)}
                      onSubmit={onSubmit}
                      onError={onError}
                    />
                    {!messageSidebarIsDisabled && (
                      <Button
                        leftIcon={<LucideIcon name="mail" />}
                        className="w-full"
                        color="vattjom"
                        data-cy="sidebar-new-message-button"
                        variant="secondary"
                        onClick={() => window.dispatchEvent(new CustomEvent('openMessage'))}
                      >
                        Nytt meddelande
                      </Button>
                    )}
                    <SuspendErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
                    <Divider className="mt-8 mb-16" />
                  </>
                )}
                <ForwardErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
                <CloseErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};
