import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  EXTRAPARAMETER_SEPARATOR,
  UppgiftField,
  extraParametersToUppgiftMapper,
  saveExtraParameters,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import Facilities from '@common/components/facilities/facilities';
import { useAppContext } from '@common/contexts/app.context';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { FacilityDTO } from '@common/interfaces/facilities';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { IconName } from 'lucide-react/dynamic';
import { Button, Divider, FormControl, FormLabel, Input, Textarea, cx, useSnackbar } from '@sk-web-gui/react';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CasedataFormFieldRenderer } from './casedata-formfield-renderer';

interface CasedataDetailsProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  registeringNewErrand: boolean;
}

async function handleSaveClick({
  fields,
  label,
  form,
  onSave,
  toastMessage,
  setIsLoading,
}: {
  fields: UppgiftField[];
  label: string;
  form: ReturnType<typeof useForm>;
  onSave: (data: ExtraParameter[]) => void;
  toastMessage: ReturnType<typeof useSnackbar>;
  setIsLoading: (label: string) => void;
}) {
  const fieldNames = fields.map((f) => f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR));
  fieldNames.push('propertyDesignation');

  const isValid = await form.trigger(fieldNames);

  if (!isValid) {
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: 'Fyll i alla obligatoriska fält i denna sektion innan du sparar',
      status: 'error',
    });

    const firstInvalid = fieldNames.find((name) => form.formState.errors[name]);
    const el = document.querySelector(`[name="${firstInvalid}"]`) as HTMLElement;
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus?.();
    }

    return;
  }

  const data: ExtraParameter[] = fieldNames.map((fieldName) => {
    const rawValue = form.getValues()[fieldName];
    const values =
      Array.isArray(rawValue) && rawValue.length > 0
        ? rawValue
        : typeof rawValue === 'string' && rawValue.trim() !== ''
        ? [rawValue]
        : [];
    return {
      key: fieldName.replace(new RegExp(EXTRAPARAMETER_SEPARATOR, 'g'), '.'),
      values,
    };
  });

  setIsLoading(label);
  onSave(data);
}

export const CasedataDetailsTab: React.FC<CasedataDetailsProps> = (props) => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const [loading, setIsLoading] = useState<string>();
  const toastMessage = useSnackbar();

  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  // const { register, setValue, getValues, trigger, control } = useForm<any>({
  //   // TODO - Correct default values?
  //   // defaultValues: errand.extraParameters,
  //   mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  // });

  const form = useForm<any>({
    mode: 'onChange',
  });
  const { register, setValue, getValues, trigger, control } = form;

  const onSaveFacilities = (estates: FacilityDTO[]) => {
    return saveFacilities(municipalityId, errand.id, estates).then(() => {
      setIsLoading(undefined);
      props.setUnsaved(false);
      return getErrand(municipalityId, errand.id.toString())
        .then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Fastighetsinformationen sparades',
            status: 'success',
          });
          setIsLoading(undefined);
        })
        .catch(() => {
          setIsLoading(undefined);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när fastighetsinformationen skulle sparas',
            status: 'error',
          });
        })
        .finally(() => {
          return true;
        });
    });
  };

  const onSave = async (extraParams: ExtraParameter[]) => {
    // If saving facilities is done when saving extraparameters, we must do them in
    // sequence, not in parallel. Otherwise the requests may collide and casedata
    // will give an error response. For now, do not save facilities and extraparameters
    // with the same button.
    //
    // if (isMEX()) {
    //   await saveFacilities(municipalityId, errand.id, getValues().facilities);
    // }

    saveExtraParameters(municipalityId, extraParams, errand)
      .then(() => {
        setIsLoading(undefined);
        props.setUnsaved(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Uppgifterna sparades',
            status: 'success',
          });
          setIsLoading(undefined);
        });
      })
      .catch(() => {
        setIsLoading(undefined);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när uppgifterna skulle sparas',
          status: 'error',
        });
      });
  };

  useEffect(() => {
    const uppgifter = extraParametersToUppgiftMapper(errand);
    const uppgifterFields: UppgiftField[] = uppgifter[errand.caseType] || [];

    setFields(uppgifterFields ?? []);
    setRealEstates(errand.facilities);
    uppgifterFields?.forEach((f) => {
      const key = f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
      const isCheckbox = f.formField.type === 'checkbox';
      const rawValue = f.value;

      setValue(
        key,
        isCheckbox
          ? Array.isArray(rawValue)
            ? rawValue
            : rawValue?.split(',').filter((v) => v !== '') ?? []
          : rawValue
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const renderFormControl = (detail: UppgiftField, idx: number) => (
    <CasedataFormFieldRenderer detail={detail} idx={idx} form={form} errand={errand} />
  );

  const renderSection = (fields: UppgiftField[], label: string, icon: IconName) => {
    const isAppeal = errand.caseType === 'APPEAL';

    return (
      <div className="my-lg">
        <Divider.Section className="w-full flex justify-between items-center flex-wrap h-40">
          <div className="flex gap-sm items-center">
            <LucideIcon name={icon} />
            <h2 className="text-h4-sm md:text-h4-md">{label}</h2>
          </div>
        </Divider.Section>

        {isAppeal && label === 'Övergripande' && (
          <p className="px-0">
            <FormControl className="w-full" key="relatesTo" disabled={isErrandLocked(errand)}>
              <FormLabel className="mt-lg">Ärende som överklagas</FormLabel>
              <Input
                type="text"
                value={errand.relatesTo[0]?.errandNumber}
                readOnly={true}
                className={cx('w-3/5')}
                data-cy="relatesTo-input"
                placeholder="t.ex. PRH-2024-000275"
              />
            </FormControl>
          </p>
        )}

        <div className="px-0">{fields?.map(renderFormControl)}</div>
      </div>
    );
  };

  const sections: { label: string; icon: IconName }[] = [
    { label: 'Övergripande', icon: 'text' },
    { label: 'Datum', icon: 'calendar' },
    { label: 'Uppsägning', icon: 'file-signature' },
    { label: 'Köpa & sälja', icon: 'wallet' },
    { label: 'Vägbidrag', icon: 'helping-hand' },
    { label: 'Yttre omständigheter', icon: 'clipboard-signature' },
    { label: 'Personlig information', icon: 'person-standing' },
    { label: 'Medicinskt utlåtande', icon: 'clipboard-signature' },
  ];

  return (
    <form
      onChange={() => {
        props.setUnsaved(true);
        trigger();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        return false;
      }}
    >
      <div className="w-full py-24 px-32">
        <div className="flex">
          <div className="w-full">
            <h2 className="text-h4-sm md:text-h4-md">Ärendeuppgifter</h2>
            {errand?.externalCaseId ? (
              <>
                <strong>Ärendenummer i e-tjänst</strong> {errand.externalCaseId}
              </>
            ) : null}
            {appConfig.features.useFacilities ? (
              <Facilities
                facilities={realEstates}
                setUnsaved={props.setUnsaved}
                setValue={setValue}
                onSave={(estates: FacilityDTO[]) => onSaveFacilities(estates)}
              />
            ) : null}
            {sections.map(({ label, icon }, idx) => {
              const filtered = fields?.filter((f) => f.section === label);
              return filtered?.length ? <div key={idx}>{renderSection(filtered, label, icon)}</div> : null;
            })}
            <div className="flex my-24 gap-xl">
              <FormControl id="description" className="w-full">
                <FormLabel>Ärendebeskrivning</FormLabel>

                <Textarea
                  className="block w-full text-[1.6rem] h-full"
                  data-cy="description-input"
                  {...register('description')}
                  placeholder="Beskriv ärendet"
                  readOnly={true}
                  rows={7}
                  id="description"
                  value={errand.description}
                />
              </FormControl>
            </div>
            <Button
              variant="primary"
              disabled={isErrandLocked(errand)}
              onClick={() =>
                handleSaveClick({
                  fields,
                  label: 'fullSave',
                  form,
                  onSave,
                  toastMessage,
                  setIsLoading,
                })
              }
              loading={loading === 'fullSave'}
              loadingText="Sparar"
              className="mt-lg"
              data-cy="save-entire-form-button"
            >
              Spara ärendeuppgifter
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
