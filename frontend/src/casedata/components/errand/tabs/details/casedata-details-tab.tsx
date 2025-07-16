import { IErrand } from '@casedata/interfaces/errand';
import { getErrand, validateAction } from '@casedata/services/casedata-errand-service';
import {
  EXTRAPARAMETER_SEPARATOR,
  UppgiftField,
  extraParametersToUppgiftMapper,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import Facilities from '@common/components/facilities/facilities';
import { useAppContext } from '@common/contexts/app.context';
import { FacilityDTO } from '@common/interfaces/facilities';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Divider, FormControl, FormLabel, Input, Textarea, cx, useSnackbar } from '@sk-web-gui/react';
import { IconName } from 'lucide-react/dynamic';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CasedataFormFieldRenderer } from './casedata-formfield-renderer';

interface CasedataDetailsProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  registeringNewErrand: boolean;
}

export const CasedataDetailsTab: React.FC<CasedataDetailsProps> = (props) => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const [loading, setIsLoading] = useState<boolean>();
  const toastMessage = useSnackbar();

  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const form = useFormContext<IErrand>();

  const { register, setValue, trigger } = form;

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

  useEffect(() => {
    const uppgifter = extraParametersToUppgiftMapper(errand);
    const uppgifterFields: UppgiftField[] = uppgifter[errand.caseType] || [];

    setFields(uppgifterFields ?? []);
    setRealEstates(errand.facilities);

    uppgifterFields?.forEach((f) => {
      const key = f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
      const isCheckbox = f.formField.type === 'checkbox';
      const rawValue = f.value;

      setValue<any>(
        key,
        isCheckbox
          ? Array.isArray(rawValue)
            ? rawValue
            : rawValue?.split(',').filter((v) => v !== '') ?? []
          : rawValue
      );
    });

    setValue('description', errand.description || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

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
          </p>
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
                />
              </FormControl>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
