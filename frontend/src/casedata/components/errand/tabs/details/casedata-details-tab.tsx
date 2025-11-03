import { IErrand } from '@casedata/interfaces/errand';
import { getErrand } from '@casedata/services/casedata-errand-service';
import {
  EXTRAPARAMETER_SEPARATOR,
  UppgiftField,
  extraParametersToUppgiftMapper,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import Facilities from '@common/components/facilities/facilities';
import { useAppContext } from '@common/contexts/app.context';
import { FacilityDTO } from '@common/interfaces/facilities';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Disclosure, FormControl, FormLabel, Input, cx, useSnackbar } from '@sk-web-gui/react';
import { IconName } from 'lucide-react/dynamic';
import dynamic from 'next/dynamic';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { baseDetails } from '../../extraparameter-templates/base-template';
import { CasedataFormFieldRenderer } from './casedata-formfield-renderer';
const TextEditor = dynamic(() => import('@sk-web-gui/text-editor'), { ssr: false });

export const CasedataDetailsTab: React.FC<{}> = () => {
  const { municipalityId, errand, setErrand, user, setUnsavedFacility } = useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const toastMessage = useSnackbar();

  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const form = useFormContext<IErrand>();

  const { watch, setValue, trigger } = form;

  const description = watch('description');
  const priority = watch('priority');
  const diagnoses = useWatch<string[]>({
    name: `medical${EXTRAPARAMETER_SEPARATOR}diagnoses` as any,
  });

  const onSaveFacilities = (estates: FacilityDTO[]) => {
    return saveFacilities(municipalityId, errand.id, estates).then(() => {
      setIsLoading(undefined);
      setUnsavedFacility(false);
      return getErrand(municipalityId, errand.id.toString())
        .then((res) => {
          setErrand(res.errand);
          toastMessage(
            getToastOptions({
              message: 'Fastighetsinformationen sparades',
              status: 'success',
            })
          );
        })
        .catch(() => {
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

  useEffect(() => {
    const uppgifter = extraParametersToUppgiftMapper(errand);
    const uppgifterFields: UppgiftField[] = uppgifter[errand.caseType] || baseDetails;

    setFields(uppgifterFields ?? []);
    setRealEstates(errand.facilities);

    uppgifterFields?.forEach((f) => {
      const key = f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
      const rawValue = f.value;
      if (f.formField.type === 'checkbox' || Array.isArray(rawValue)) {
        const normalizedArray = Array.isArray(rawValue)
          ? rawValue
          : typeof rawValue === 'string'
          ? rawValue
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '')
          : [];
        setValue<any>(key, normalizedArray, { shouldDirty: false });
      } else {
        setValue<any>(key, rawValue, { shouldDirty: false });
      }
    });

    setValue('description', errand.description || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const renderSection = (fields: UppgiftField[], label: string, icon: IconName) => {
    const isAppeal = errand.caseType === 'APPEAL';

    return (
      <div className="my-lg">
        <Disclosure
          variant="alt"
          header={label}
          data-cy={`section-${label}-disclosure`}
          icon={<LucideIcon name={icon as any} />}
        >
          {isAppeal && label === 'Övergripande' && (
            <div className="px-0">
              <FormControl className="w-full" key="relatesTo">
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
            </div>
          )}

          <div className="px-0">
            {fields?.map((detail, idx) => (
              <CasedataFormFieldRenderer
                key={`${detail.field}-${idx}`}
                detail={detail}
                idx={idx}
                form={form}
                errand={errand}
              />
            ))}
          </div>
        </Disclosure>
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
        setUnsavedFacility(true);
        trigger();
      }}
      onSubmit={(event) => {
        event.preventDefault();
        return false;
      }}
    >
      <h2 className="text-h2-md mb-md">Ärendeuppgifter</h2>
      {errand?.externalCaseId ? (
        <>
          <strong className="my-lg">Ärendenummer i e-tjänst</strong> {errand.externalCaseId}
        </>
      ) : null}
      {appConfig.features.useFacilities ? (
        <Disclosure variant="alt" header="Fastigheter" icon={<LucideIcon name="map-pin" />}>
          <Facilities
            facilities={realEstates}
            setValue={setValue}
            onSave={(estates: FacilityDTO[]) => onSaveFacilities(estates)}
          />
        </Disclosure>
      ) : null}
      {sections.map(({ label, icon }, idx) => {
        const filtered = fields?.filter((f) => f.section === label);
        return filtered?.length ? <div key={idx}>{renderSection(filtered, label, icon)}</div> : null;
      })}
      <div className="flex my-24 gap-xl">
        <FormControl id="description" className="w-full">
          <FormLabel>Ärendebeskrivning</FormLabel>

          <TextEditor
            className={'h-[25rem] case-description-editor'}
            readOnly
            disableToolbar
            value={{ markup: description }}
          />
        </FormControl>
      </div>
    </form>
  );
};
