import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Role } from '@casedata/interfaces/role';
import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked, saveErrand } from '@casedata/services/casedata-errand-service';
import {
  EXTRAPARAMETER_SEPARATOR,
  extraParametersToUppgiftMapper,
  saveExtraParameters,
  UppgiftField,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import {
  editStakeholder,
  removeStakeholder,
  stakeholder2Contact,
} from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { FacilityDTO } from '@common/interfaces/facilities';
import { deepFlattenToObject } from '@common/services/helper-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const SaveButtonComponent: React.FC<{
  registeringNewErrand?: boolean;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  color?: string;
  label?: string;
  icon?: JSX.Element;
}> = (props) => {
  const {
    errand,
    administrators,
    municipalityId,
    setErrand,
  }: {
    errand: IErrand;
    administrators: Stakeholder[];
    municipalityId: string;
    setErrand: (e: IErrand) => void;
  } = useAppContext();
  const [error, setError] = useState(false);
  const [errandNumber, setErrandNumber] = useState<string | undefined>(errand?.errandNumber);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const router = useRouter();
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara ärendet',
    content: 'Vill du spara ärendet?',
  });

  const { registeringNewErrand } = props;
  const saveCaseDetails = useSaveCaseDetails();
  const { handleSubmit, getValues, reset, formState }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (registeringNewErrand) {
      setConfirmContent({
        title: 'Registrera ärende',
        content: (
          <>
            När du registrerar ett ärende kommer det automatiskt att placeras under kategorin &quot;Nya ärenden&quot;.
            Därefter blir det tillgängligt för alla behöriga medarbetare inom din verksamhet.
            <br />
            <br />
            Vill du fortsätta med registreringen?
          </>
        ),
      });
    } else {
      setConfirmContent({
        title: 'Spara ärendet',
        content: 'Vill du spara ärendet?',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const onError = (errors, e) => {
    console.error('Some error', errors);
  };

  function useSaveCaseDetails() {
    const form = useFormContext<IErrand>();

    return async function saveCaseDetails({
      data,
      municipalityId,
      toastMessage,
      errand,
    }: {
      data: any;
      municipalityId: string;
      toastMessage: ReturnType<typeof useSnackbar>;
      errand: IErrand;
    }): Promise<ExtraParameter[] | null> {
      if (!errand.extraParameters) {
        return [];
      }

      const uppgifter = extraParametersToUppgiftMapper(data);
      const uppgifterFields: UppgiftField[] = uppgifter[data.caseType] || [];

      const fieldNames = uppgifterFields.map((f) =>
        f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)
      ) as (keyof IErrand)[];
      fieldNames.push('propertyDesignation' as keyof IErrand);
      fieldNames.push('facilities' as keyof IErrand);

      const isValid = await form.trigger(fieldNames);

      if (!isValid) {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fyll i alla obligatoriska fält i ärendeuppgifterna innan du sparar',
          status: 'error',
        });

        const firstInvalid = fieldNames.find((name) => form.formState.errors[name]);
        const el = document.querySelector(`[name="${firstInvalid}"]`) as HTMLElement;
        if (el?.scrollIntoView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus?.();
        }

        return null;
      }

      if (appConfig.features.useFacilities) {
        const facilities = form.getValues('facilities');
        const validFacilities: FacilityDTO[] = facilities.map((f) => ({
          ...f,
          address: {
            ...f.address,
            propertyDesignation: f.address?.propertyDesignation ?? '',
          },
        }));

        if (errand.id) {
          try {
            await saveFacilities(municipalityId, errand.id, validFacilities);
          } catch (e) {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Kunde inte spara fastighetsinformation',
              status: 'error',
            });
            return null;
          }
        }
      }

      const extraParams: ExtraParameter[] = fieldNames.map((fieldName) => {
        const rawValue = form.getValues()[fieldName];
        const values: string[] = Array.isArray(rawValue)
          ? rawValue.map((v) => String(v)).filter((v) => v.trim() !== '')
          : typeof rawValue === 'string'
          ? [rawValue.trim()]
          : rawValue != null
          ? [String(rawValue).trim()]
          : [];
        return {
          key: fieldName.replace(new RegExp(EXTRAPARAMETER_SEPARATOR, 'g'), '.'),
          values,
        };
      });

      await saveExtraParameters(municipalityId, extraParams, errand);
      return extraParams;
    };
  }

  const onSubmit = async () => {
    const data: IErrand = getValues();

    if (formState.dirtyFields['administratorName']) {
      data.administrator = administrators.find((a) => `${a.firstName} ${a.lastName}` === data.administratorName);
    }

    if (data.administrator && data.administrator.adAccount) {
      const adAccount = data.administrator.adAccount.toLowerCase();

      data.stakeholders =
        data.stakeholders?.filter(
          (s) => !s.roles?.includes(Role.ADMINISTRATOR) && s.adAccount?.toLowerCase() !== adAccount
        ) || [];

      const mappedAdmin = {
        ...stakeholder2Contact(data.administrator),
        newRole: Role.ADMINISTRATOR,
      };

      data.stakeholders.push(mappedAdmin);
    }

    const extraParams = await saveCaseDetails({
      data,
      municipalityId,
      toastMessage,
      errand,
    });

    if (extraParams === null) return;

    let dataToSave: Partial<IErrand> & { municipalityId: string };

    if (registeringNewErrand) {
      const { administrator, ...rest } = data;
      dataToSave = rest;
    } else {
      const dirtyData = {
        id: data.id,
        municipalityId: data.municipalityId,
        ...Object.entries(formState.dirtyFields).reduce((acc, [field, dirty]) => {
          if (dirty) acc[field] = data[field];
          return acc;
        }, {} as any),
      };

      delete dirtyData.administrator;
      dataToSave = dirtyData;
    }

    setError(false);
    setIsLoadingContinue(true);

    try {
      dataToSave.stakeholders?.forEach(async (stakeholder) => {
        if (stakeholder?.id) {
          await editStakeholder(municipalityId, dataToSave?.id.toString(), stakeholder);
        }
      });

      const res = await saveErrand(dataToSave);
      const saved = await getErrand(municipalityId, res.errandId.toString());
      const removedStakeholders = (dataToSave.stakeholders ?? []).filter((s) => s.removed);

      for (const removed of removedStakeholders) {
        await removeStakeholder(municipalityId, res.errandId.toString(), removed.id);
      }

      const saved2 = await getErrand(municipalityId, res.errandId.toString());
      setErrand(saved2.errand);
      setErrandNumber(saved2.errand?.errandNumber);

      if (registeringNewErrand) {
        reset();
      }

      toastMessage(
        getToastOptions({
          message: 'Ärendet sparades',
          status: 'success',
        })
      );
    } catch (e) {
      console.error('Error when saving errand:', e);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när ärendet sparades',
        status: 'error',
      });
      setError(true);
    } finally {
      setIsLoadingContinue(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      if (errandNumber && window.location.pathname.includes('registrera') && !formState.isDirty) {
        console.log('Redirecting to errand page after registration, formState.isDirty:', formState.isDirty);
        router.push(`/arende/${municipalityId}/${errandNumber}`);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.isDirty, errandNumber]);

  return (
    <div className="w-full flex gap-lg items-end">
      <Button
        className={registeringNewErrand ? 'w-min' : 'w-full mt-8'}
        data-cy="save-and-continue-button"
        disabled={
          isErrandLocked(errand) ||
          !Object.values(deepFlattenToObject(formState.dirtyFields)).some((v) => v) ||
          !formState.isValid ||
          errand.status?.statusType === ErrandStatus.Parkerad
        }
        type="button"
        onClick={handleSubmit(() => {
          if (registeringNewErrand) {
            return saveConfirm
              .showConfirmation(confirmContent.title, confirmContent.content, 'Ja', 'Nej', 'info', 'info')
              .then((confirmed) => {
                if (confirmed) {
                  onSubmit();
                }
                return confirmed ? () => true : () => {};
              });
          } else {
            onSubmit();
          }
        }, onError)}
        color={
          (props.color as
            | 'info'
            | 'success'
            | 'primary'
            | 'warning'
            | 'error'
            | 'vattjom'
            | 'gronsta'
            | 'bjornstigen'
            | 'juniskar') || 'primary'
        }
        rightIcon={props.icon ? <LucideIcon name="arrow-right" size={18} /> : null}
        loading={isLoadingContinue}
        loadingText="Sparar"
      >
        {props.label || 'Spara'}
      </Button>
    </div>
  );
};
