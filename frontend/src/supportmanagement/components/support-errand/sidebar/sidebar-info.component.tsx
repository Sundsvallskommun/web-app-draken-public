import { UiPhase } from '@casedata/interfaces/errand-phase';
import { useAppContext } from '@common/contexts/app.context';
import { deepFlattenToObject } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, FormControl, FormLabel, Label, Select, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { Priority } from '@supportmanagement/interfaces/priority';
import {
  Status,
  StatusLabel,
  SupportErrand,
  defaultSupportErrandInformation,
  findPriorityLabelForPriorityKey,
  findStatusKeyForStatusLabel,
  findStatusLabelForStatusKey,
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
import router from 'next/router';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { UseFormReturn, useFormContext } from 'react-hook-form';
import { CloseErrandComponent } from './close-errand.component';
import { ForwardErrandComponent } from './forward-errand.component';
import { RequestInfoComponent } from './request-info.component';
import { RequestInternalComponent } from './request-internal.component';
import { SuspendErrandComponent } from './suspend-errand.component';

export const SidebarInfo: React.FC<{
  unsavedFacility: boolean;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const {
    user,
    supportErrand,
    setSupportErrand,
    administrators,
    municipalityId,
  }: {
    user: any;
    supportErrand: SupportErrand;
    setSupportErrand: any;
    administrators: Admin[];
    uiPhase: UiPhase;
    municipalityId: string;
  } = useAppContext();
  const [selectableStatuses, setSelectableStatuses] = useState<string[]>([]);
  const [selectablePriorities, setSelectablePriorities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<'status' | 'admin' | 'priority' | 'suspend' | false | true>();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
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

    if (supportErrandIsEmpty(supportErrand)) {
      const formdata = getValues();
      return updateSupportErrand(municipalityId, formdata)
        .then((res) => {
          setIsLoading(false);
          if (supportErrand.assignedUserId !== administrators.find((a) => a.displayName === getValues().admin).adAccount) {
            saveAdmin();
          }

          if (props.unsavedFacility) {
            saveFacilityInfo(supportErrand.id, getValues().facilities)
              .then(() => {
                props.setUnsavedFacility(false);
                setIsLoading(false);
              })
              .catch((e) => {
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
          if (formdata.status === 'Inkommet' && formdata.assignedUserId) {
            updateSupportErrandStatus(Status.ONGOING);
          } else if (formdata.status !== 'Inkommet' && formdata.assignedUserId) {
            updateSupportErrandStatus(Status[findStatusKeyForStatusLabel(getValues().status)]);
          }
          reset();
          getSupportErrandById(supportErrand.id, municipalityId)
            .then((res) => setSupportErrand(res.errand))
            .then(() =>
              setTimeout(() => {
                router.push(`/arende/${municipalityId}/${formdata.id}`, `/arende/${municipalityId}/${formdata.id}`, {
                  shallow: true,
                });
              }, 10)
            );
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Ärendet sparades',
            status: 'success',
          });
          return res;
        })
        .catch((e) => {
          console.error('Error when updating errand:', e);
          setError(true);
          setIsLoading(false);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när ärendet sparades',
            status: 'error',
          });
          return true;
        });
    } else {
      return updateSupportErrand(municipalityId, getValues())
        .then((res) => {
          setIsLoading(false);          
          if (supportErrand.assignedUserId !== administrators.find((a) => a.displayName === getValues().admin).adAccount) {
            saveAdmin();
          } else if (supportErrand.status !== Status[findStatusKeyForStatusLabel(getValues().status)]) {
            updateSupportErrandStatus(Status[findStatusKeyForStatusLabel(getValues().status)]);
          }

          if (props.unsavedFacility) {
            saveFacilityInfo(supportErrand.id, getValues().facilities)
              .then(() => {
                props.setUnsavedFacility(false);
                setIsLoading(false);
              })
              .catch((e) => {
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
    }
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
    if (supportErrand?.id && supportErrand?.status) {
      setValue('status', findStatusLabelForStatusKey(supportErrand.status));
    } else {
      setValue('status', 'Välj status');
    }
    if (supportErrand?.id && supportErrand?.priority) {
      setValue('priority', findPriorityLabelForPriorityKey(supportErrand.priority));
    } else {
      setValue('priority', 'Välj prioritet');
    }
  }, [supportErrand, administrators]);

  useEffect(() => {
    const s = [StatusLabel.NEW, StatusLabel.ONGOING, StatusLabel.PENDING, StatusLabel.AWAITING_INTERNAL_RESPONSE];
    if (!s.includes(findStatusLabelForStatusKey(supportErrand.status as Status))) {
      s.unshift(findStatusLabelForStatusKey(supportErrand.status as Status));
    }
    setSelectableStatuses(s);
  }, [supportErrand]);

  useEffect(() => {
    const prio = [Priority.LOW, Priority.MEDIUM, Priority.HIGH];
    if (!prio.includes(findPriorityLabelForPriorityKey(supportErrand.priority as Priority))) {
      prio.unshift(findPriorityLabelForPriorityKey(supportErrand.priority as Priority));
    }
    setSelectablePriorities(prio);
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
      case 'SOLVED': {
        return solutionComponent('Löst', 'avslutade ärendet.', 'check');
      }
      case 'CLOSED': {
        return solutionComponent('Avslutat', 'avslutade ärendet.', 'check');
      }
      case 'BACK_TO_MANAGER': {
        return solutionComponent('Åter till chef', 'avslutade ärendet.', 'redo');
      }
      case 'BACK_TO_HR': {
        return solutionComponent('Åter till HR', 'avslutade ärendet.', 'redo');
      }
      case 'REFERRED_VIA_EXCHANGE': {
        return solutionComponent('Löst', 'löste ärendet via växelsystemet.', 'split');
      }
      case 'CONNECTED': {
        return solutionComponent('Löst', 'avslutade ärendet genom att koppla.', 'check');
      }
      case 'REGISTERED_EXTERNAL_SYSTEM': {
        return solutionComponent('Eskalerat', 'eskalerade ärendet.', 'split');
      }
      case 'SELF_SERVICE': {
        return solutionComponent('Löst', 'hänvisade till självservice.', 'check');
      }
      case 'INTERNAL_SERVICE': {
        return solutionComponent('Löst', 'hänvisade till intern service.', 'check');
      }
    }
  };

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
      {supportErrand?.id ? (
        <div className="w-full mt-md flex flex-col gap-12">
          <FormControl id="administrator" className="w-full">
            <FormLabel className="flex justify-between text-small">
              Ansvarig{' '}
              <Button
                variant="link"
                className="font-normal"
                size="sm"
                disabled={!isAdmin() || supportErrand?.assignedUserId === user.username}
                onClick={() => {
                  selfAssignSupportErrand();
                }}
                data-cy="self-assign-errand-button"
              >
                Ta ärende
              </Button>
            </FormLabel>
            <Select
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
              disabled={supportErrand.status === Status.SOLVED || !supportErrand.assignedUserId}
            >
              {!supportErrand?.status ? <Select.Option>Välj status</Select.Option> : null}
              {selectableStatuses.map((c: string, index) => (
                <Select.Option value={c} key={`${c}-${index}`}>
                  {c}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {supportErrand.status !== Status.SOLVED && (
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
                disabled={!supportErrand.assignedUserId}
              >
                {!supportErrand?.priority ? <Select.Option>Välj prioritet</Select.Option> : null}
                {selectablePriorities.map((c: string, index) => (
                  <Select.Option value={c} key={`${c}-${index}`}>
                    {c}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          )}

          <div className="w-full">
            <Button
              className="w-full my-8"
              data-cy="save-button"
              type="button"
              disabled={
                isSupportErrandLocked(supportErrand) ||
                !Object.values(deepFlattenToObject(formState.dirtyFields)).some((v) => v) ||
                !formState.isValid
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
                    <p className="mb-24">Ärendet parkerades utan en handläggare.</p>
                  ) : (
                    <p className="mb-24">
                      <strong>{getValues('admin')}</strong>
                      {supportErrand?.status === Status.SUSPENDED
                        ? ' parkerade ärendet med en påminnelse '
                        : ' tilldelades ärendet'}{' '}
                      {supportErrand.suspension?.suspendedTo
                        ? dayjs(supportErrand.suspension?.suspendedTo).format('DD MMM, HH:mm')
                        : supportErrand?.status === Status.SUSPENDED && '(datum saknas)'}
                    </p>
                  )}
                </p>

                <Button
                  className="w-full"
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
            ) : (
              <div className="flex flex-col gap-8">
                <RequestInfoComponent
                  disabled={!validateAction(supportErrand, user) || supportErrandIsEmpty(supportErrand)}
                />
                <RequestInternalComponent
                  disabled={!validateAction(supportErrand, user) || supportErrandIsEmpty(supportErrand)}
                />
                <SuspendErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
                <Divider className="mt-8 mb-16" />
                <ForwardErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
                <CloseErrandComponent disabled={!allowed || supportErrandIsEmpty(supportErrand)} />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
