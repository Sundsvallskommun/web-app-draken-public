import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { deepFlattenToObject, prettyTime } from '@common/services/helper-service';
import { Button, Divider, FormControl, FormLabel, Label, Select, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { Priority } from '@supportmanagement/interfaces/priority';
import {
  defaultSupportErrandInformation,
  getSupportErrandById,
  isSupportErrandLocked,
  Resolution,
  setSupportErrandAdmin,
  setSupportErrandStatus,
  Status,
  supportErrandIsEmpty,
  updateSupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { saveFacilityInfo } from '@supportmanagement/services/support-facilities';
import dayjs from 'dayjs';
import { CirclePause, Mail } from 'lucide-react';
import { Dispatch, FC, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

import { SupportCloseErrandButtonComponent } from './buttons/support-close-errand-button.component';
import { SupportForwardErrandButtonComponent } from './buttons/support-forward-errand-button.component';
import { SupportReopenErrandButton } from './buttons/support-reopen-errand-button.component';
import { SupportResumeErrandButton } from './buttons/support-resume-errand-button.component';
import { SupportStartProcessButtonComponent } from './buttons/support-start-process-button.component';
import { SupportSuspendErrandButtonComponent } from './buttons/support-suspend-errand-button.component';

export const SidebarInfo: FC<{
  unsavedFacility: boolean;
  setUnsavedFacility: Dispatch<SetStateAction<boolean>>;
}> = (props) => {
  const user = useUserStore((s) => s.user);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setSupportErrand = useSupportStore((s) => s.setSupportErrand);
  const administrators = useUserStore((s) => s.administrators);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const selectablePriorities = useMemo(() => {
    if (supportErrand?.priority && supportErrand?.status) {
      return [
        { key: 'LOW', label: Priority.LOW },
        { key: 'MEDIUM', label: Priority.MEDIUM },
        { key: 'HIGH', label: Priority.HIGH },
      ];
    }
    return [];
  }, [supportErrand]);
  const [isLoading, setIsLoading] = useState<'status' | 'admin' | 'priority' | 'suspend' | false | true>();
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();
  const allowed = useMemo(() => {
    if (!supportErrandIsEmpty(supportErrand!)) {
      let _a = validateAction(supportErrand!, user);
      if (supportErrand!.assignedUserId?.toLocaleLowerCase() === undefined) {
        if (
          supportErrand!.channel === 'EMAIL' ||
          supportErrand!.channel === 'ESERVICE' ||
          supportErrand!.channel === 'ESERVICE_INTERNAL'
        ) {
          _a = true;
        }
      }
      return _a;
    } else {
      return administrators.some((a) => a.adAccount === user.username);
    }
  }, [user, supportErrand, administrators]);

  const toast = (kind: 'success' | 'error', label: string) =>
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

  const onSubmit = async () => {
    setError(false);
    setIsLoading(true);

    const municipalityId = defaultSupportErrandInformation.municipalityId;

    try {
      await updateSupportErrand(municipalityId, getValues());

      // Handle admin change
      const newAdminAccount = administrators.find((a) => a.displayName === getValues().admin)?.adAccount;
      if (supportErrand?.assignedUserId !== newAdminAccount) {
        const assigner = administrators.find((a) => a.adAccount === user.username);
        if (newAdminAccount && assigner) {
          const newStatus = newAdminAccount === assigner.adAccount ? Status.ONGOING : Status.ASSIGNED;
          await setSupportErrandAdmin(
            supportErrand!.id!,
            municipalityId,
            newAdminAccount,
            newStatus,
            assigner.adAccount
          );
        }
      } else if (supportErrand?.status !== getValues().status) {
        // Handle status change
        await setSupportErrandStatus(supportErrand!.id!, municipalityId, getValues().status);
      }

      // Handle facility save
      if (props.unsavedFacility) {
        try {
          await saveFacilityInfo(supportErrand!.id!, getValues().facilities);
          props.setUnsavedFacility(false);
        } catch {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när fastigheter i ärendet sparades',
            status: 'error',
          });
        }
      }

      // Single fetch + reset after all operations complete
      const e = await getSupportErrandById(getValues().id!, municipalityId);
      setSupportErrand(e.errand);
      reset(e.errand);

      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Ärendet uppdaterades',
        status: 'success',
      });
    } catch (e) {
      console.error('Error when updating errand:', e);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när ärendet uppdaterades',
        status: 'error',
      });
      setError(true);
    } finally {
      setIsLoading(false);
    }
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

  const handleAction = (action: () => Promise<boolean>, success: () => void, fail: () => void) => {
    return action()
      .then(async () => {
        success();
        setIsLoading(false);
        const res = await getSupportErrandById(supportErrand!.id!, municipalityId);
        setSupportErrand(res.errand);
        reset(res.errand);
      })
      .catch(() => {
        fail();
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const selfAssignSupportErrand = () => {
    const admin = administrators.find((a) => a.adAccount === user.username);
    if (admin) {
      setIsLoading('admin');
      setError(false);
      return handleAction(
        () =>
          setSupportErrandAdmin(
            supportErrand!.id!,
            municipalityId,
            admin?.adAccount!,
            Status.ONGOING,
            admin?.adAccount!
          ),
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

  const solutionComponent = (label: string, info: string, icon: string) => (
    <>
      <div className="flex">
        <Label rounded>
          {(() => {
            const DynIcon = iconMap[icon];
            return DynIcon ? <DynIcon size="1.5rem" /> : undefined;
          })()}{' '}
          {label}
        </Label>{' '}
        <p className="text-small ml-8">{dayjs(supportErrand?.modified).format('DD MMM, HH:mm')}</p>
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
    }
  };

  const messageSidebarIsDisabled =
    !supportErrand ||
    isSupportErrandLocked(supportErrand!) ||
    !allowed ||
    [Status.NEW, Status.SUSPENDED, Status.ASSIGNED, Status.SOLVED].includes(supportErrand.status as Status);

  const onError = () => {
    console.error('Something went wrong when saving');
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
                  supportErrandIsEmpty(supportErrand!) || !isAdmin() || supportErrand?.assignedUserId === user.username
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
                supportErrand?.status === Status.REOPENED ||
                (!supportErrandIsEmpty(supportErrand!) && !supportErrand?.assignedUserId)
              }
            >
              {!supportErrand?.status ? <Select.Option>Välj status</Select.Option> : null}
              {supportMetadata?.statuses?.map((status, index) => (
                <Select.Option value={status?.name} key={`${status?.name}-${index}`}>
                  {status?.displayName}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {supportErrand?.status !== Status.SOLVED && supportErrand?.status !== Status.REOPENED && (
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
              isSupportErrandLocked(supportErrand!) ||
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
                {renderLabelSwitch(supportErrand.resolution!)}
                <SupportReopenErrandButton />
              </>
            ) : supportErrand?.status === Status.SUSPENDED || supportErrand?.status === Status.ASSIGNED ? (
              <>
                <div className="flex">
                  <Label>
                    <CirclePause size="1.5rem" />{' '}
                    {supportErrand?.status === Status.SUSPENDED ? 'Parkerat ' : 'Tilldelat '}
                  </Label>
                  <p className="text-small ml-8">{dayjs(supportErrand?.modified).format('DD MMM, HH:mm')}</p>
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
            ) : supportErrand?.status === Status.REOPENED ? (
              <div className="flex flex-col gap-8">
                <div className="flex w-fit">
                  <SupportStatusLabelComponent
                    status={supportErrand?.status}
                    resolution={supportErrand?.resolution ?? ''}
                  />
                  <p className="text-small ml-8">{prettyTime(supportErrand?.modified ?? '')}</p>
                </div>
                <span className="text-dark-secondary text-small">Ärendet har återöppnats</span>
                <SupportReopenErrandButton disabled={!allowed} />
                <SupportCloseErrandButtonComponent disabled={!allowed || supportErrandIsEmpty(supportErrand!)} />
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {allowed && !supportErrandIsEmpty(supportErrand!) && (
                  <>
                    <SupportResumeErrandButton disabled={!allowed || supportErrandIsEmpty(supportErrand!)} />
                    <SupportStartProcessButtonComponent
                      disabled={!allowed || supportErrandIsEmpty(supportErrand!)}
                      onSubmit={onSubmit}
                      onError={onError}
                    />
                    {!messageSidebarIsDisabled && (
                      <Button
                        leftIcon={<Mail />}
                        className="w-full"
                        color="vattjom"
                        data-cy="sidebar-new-message-button"
                        variant="secondary"
                        onClick={() => window.dispatchEvent(new CustomEvent('openMessage'))}
                      >
                        Nytt meddelande
                      </Button>
                    )}
                    <SupportSuspendErrandButtonComponent disabled={!allowed || supportErrandIsEmpty(supportErrand!)} />
                    <Divider className="mt-8 mb-16" />
                  </>
                )}
                <SupportForwardErrandButtonComponent disabled={!allowed || supportErrandIsEmpty(supportErrand!)} />
                <SupportCloseErrandButtonComponent disabled={!allowed || supportErrandIsEmpty(supportErrand!)} />
              </div>
            )}
          </>
        </div>
      </div>
    </div>
  );
};
