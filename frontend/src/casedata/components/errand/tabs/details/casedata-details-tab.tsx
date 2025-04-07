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
import {
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  Input,
  RadioButton,
  Select,
  Textarea,
  cx,
  useSnackbar,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface CasedataDetailsProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  registeringNewErrand: boolean;
}

export const CasedataDetailsTab: React.FC<CasedataDetailsProps> = (props) => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const [loading, setIsLoading] = useState<string>();
  const toastMessage = useSnackbar();

  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
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
    setValue,
    formState,
    getValues,
    clearErrors,
    trigger,
    reset,
    formState: { errors },
  } = useForm<any>({
    // TODO - Correct default values?
    // defaultValues: errand.extraParameters,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const onSaveFacilities = (estates: FacilityDTO[]) => {
    return saveFacilities(municipalityId, errand.id, estates).then((res) => {
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
        .catch((e) => {
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
      .then((res) => {
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
      .catch((e) => {
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
    const uppgifterFields: UppgiftField[] = uppgifter[errand.caseType];

    setFields(uppgifterFields ?? []);
    setRealEstates(errand.facilities);
    uppgifterFields?.forEach((f) => {
      setValue(f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR), f.value);
    });
  }, [errand]);

  const renderFormControl = (detail: UppgiftField, idx: number) => {
    const dependent: boolean =
      detail.dependsOn?.length > 0
        ? detail.dependsOn.every((d) => getValues(d.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)) === d.value)
        : true;
    return dependent ? (
      <FormControl className="w-full" key={`${detail.field}-${idx}`} disabled={isErrandLocked(errand)}>
        {detail.field === `account.ownerIdentifier` ||
        detail.field === `account.owner` ||
        detail.field === `account.bank` ||
        detail.field === `account.number` ? null : (
          <FormLabel className="mt-lg">{detail.label}</FormLabel>
        )}

        {detail.formField.type === 'text' ||
        detail.formField.type === 'date' ||
        detail.formField.type === 'datetime-local' ? (
          errand.caseType !== 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE' ? (
            <Input
              type={detail.formField.type}
              {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
              value={
                errand.caseType === 'APPEAL' && detail.formField.type === 'text'
                  ? errand.relatesTo[0]?.errandNumber
                  : null
              }
              readOnly={errand.caseType === 'APPEAL' && detail.formField.type === 'text'}
              className={cx(
                errand.caseType === 'APPEAL' ? 'w-3/5' : detail.formField.type === 'date' ? `w-1/2` : 'w-full'
              )}
              data-cy={`${detail.field}-input`}
              max={detail.formField.type === 'date' ? dayjs().format('YYYY-MM-DD').toString() : undefined}
              placeholder={detail.formField.type === 'text' ? detail.formField.options?.placeholder : undefined}
            />
          ) : (
            <>
              {getValues(`account${EXTRAPARAMETER_SEPARATOR}type`) === 'Bankkonto' ? (
                <>
                  {detail.label !== 'Giro-nummer' && detail.label !== 'Giro-ägare' && (
                    <>
                      <FormLabel className="mt-lg">{detail.label}</FormLabel>
                      <Input
                        type={detail.formField.type}
                        {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
                        className={cx(detail.formField.type === 'date' ? `w-1/2` : 'w-full')}
                        data-cy={`${detail.field}-input`}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {detail.label !== 'Kontonummer' &&
                    detail.label !== 'Kontoägarens personnummer' &&
                    detail.label !== 'Kontoägare' && (
                      <>
                        <FormLabel className="mt-lg">{detail.label}</FormLabel>
                        <Input
                          type={detail.formField.type}
                          {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
                          className={cx(detail.formField.type === 'date' ? `w-1/2` : 'w-full')}
                          data-cy={`${detail.field}-input`}
                        />
                      </>
                    )}
                </>
              )}
            </>
          )
        ) : detail.formField.type === 'select' ? (
          <Select
            {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
            className="w-content"
            data-cy={`${detail.field}-select`}
          >
            <Select.Option value="">Välj</Select.Option>
            {detail.formField.options.map((o, oIdx) => (
              <Select.Option key={`${o}-${oIdx}`} value={o.value}>
                {o.label}
              </Select.Option>
            ))}
          </Select>
        ) : detail.formField.type === 'textarea' ? (
          <>
            <Textarea
              rows={3}
              className={cx(errand.caseType === 'APPEAL' ? 'w-2/3' : 'w-full')}
              value={detail.value}
              {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
              data-cy={`${detail.field}-textarea`}
            />
          </>
        ) : detail.formField.type === 'radio' ? (
          <>
            <RadioButton.Group
              defaultValue={getValues(detail.field)}
              data-cy={`${detail.field}-radio-button-group`}
              inline={!!detail.formField.inline}
            >
              {detail.formField.options.map((option, index) => (
                <RadioButton
                  value={option.value}
                  {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))}
                  key={`${option}-${index}`}
                  data-cy={`${detail.field}-radio-button-${index}`}
                >
                  {option.label}
                </RadioButton>
              ))}
            </RadioButton.Group>
          </>
        ) : detail.formField.type === 'radioPlus' ? (
          <>
            <Input {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))} hidden></Input>
            <RadioButton.Group
              defaultValue={
                detail.formField.options.find((option) => option.value === getValues(detail.field))?.value ||
                'ownOption'
              }
              data-cy={`${detail.field}-radio-button-group`}
            >
              {detail.formField.options.map((option, index) => (
                <RadioButton
                  value={option.value}
                  onClick={(event) => {
                    const element = event.currentTarget as HTMLInputElement;
                    setValue(detail.field, element.value);
                  }}
                  key={`${option}-${index}`}
                  data-cy={`${detail.field}-radio-button-${index}`}
                >
                  {option.label}
                </RadioButton>
              ))}

              <RadioButton
                checked={
                  detail.formField.options.findIndex((option) => option.value === getValues(detail.field)) === -1
                }
                value="ownOption"
                data-cy={`${detail.field}-radio-button`}
              >
                {detail.formField.ownOption}:
                <Input
                  onChange={(event) => {
                    setValue(detail.field, event.target.value);
                  }}
                  value={
                    detail.formField.options.findIndex((option) => option.value === getValues(detail.field)) === -1
                      ? getValues(detail.field)
                      : ''
                  }
                  data-cy={`${detail.field}-input`}
                ></Input>
              </RadioButton>
            </RadioButton.Group>
          </>
        ) : detail.formField.type === 'checkbox' ? (
          <>
            <Input {...register(detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR))} type="hidden"></Input>
            <Checkbox.Group direction="row">
              {detail.formField.options.map((option, index) => {
                const formFieldKey = detail.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR);
                const currentValuesArray =
                  getValues(formFieldKey)
                    ?.split(',')
                    ?.filter((v) => v !== '' && v !== ' ') || [];
                const thisValue = option.value;
                const thisIsSelected = currentValuesArray?.includes(thisValue);

                return (
                  <Checkbox
                    value={option.name}
                    name={option.name}
                    key={`${option}-${index}`}
                    data-cy={`${detail.field}-checkbox-${index}`}
                    onChange={(val) => {
                      if (!val.currentTarget.checked) {
                        setValue(formFieldKey, currentValuesArray.filter((v) => v !== thisValue).join() || '');
                      } else {
                        setValue(formFieldKey, [...currentValuesArray, thisValue].join());
                      }
                    }}
                    checked={thisIsSelected}
                  >
                    {option.label}
                  </Checkbox>
                );
              })}
            </Checkbox.Group>
          </>
        ) : null}
      </FormControl>
    ) : null;
  };

  const renderSection = (fields: UppgiftField[], label: string) => {
    return (
      <div className="my-lg">
        {errand.caseType === 'APPEAL' ? (
          <Divider.Section className="w-full flex justify-between items-center flex-wrap h-40">
            <div className="flex gap-sm items-center">
              <LucideIcon name="clipboard-signature"></LucideIcon>
              <h2 className="text-h4-sm md:text-h4-md">Överklagan</h2>
            </div>
          </Divider.Section>
        ) : null}
        <div className="px-0 md:px-24 lg:px-40">
          {fields?.map(renderFormControl)}
          <Button
            key={`section-${label}`}
            variant="primary"
            disabled={isErrandLocked(errand)}
            onClick={() => {
              try {
                const data: ExtraParameter[] = [];
                fields.forEach((f) => {
                  data.push({
                    key: f.field,
                    values: [getValues()[f.field.replace(/\./g, EXTRAPARAMETER_SEPARATOR)]],
                  });
                });
                data.push({
                  key: 'propertyDesignation',
                  values: [getValues('propertyDesignation')],
                });

                setIsLoading(label);
                onSave(data);
              } catch (error) {
                console.error('Error: ', error);
              }
            }}
            loading={loading === label}
            loadingText="Sparar"
            className="mt-lg"
            data-cy="save-errand-information-button"
          >
            Spara
          </Button>
        </div>
      </div>
    );
  };

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
            <h2 className="text-h2-md">Ärendeuppgifter</h2>
            {errand?.externalCaseId ? (
              <>
                <strong>Ärendenummer i e-tjänst</strong> {errand.externalCaseId}
              </>
            ) : null}
            {appConfig.features.useFacilites ? (
              <Facilities
                facilities={realEstates}
                setUnsaved={props.setUnsaved}
                setValue={setValue}
                onSave={(estates: FacilityDTO[]) => onSaveFacilities(estates)}
              />
            ) : null}
            {[
              {
                label: 'Övergripande',
                icon: 'text',
              },
              {
                label: 'Datum',
                icon: 'calendar',
              },
              {
                label: 'Uppsägning',
                icon: 'file-signature',
              },
              {
                label: 'Köpa & sälja',
                icon: 'wallet',
              },
              {
                label: 'Vägbidrag',
                icon: 'helping-hand',
              },
            ].map(({ label }, idx) => {
              const filtered = fields?.filter((f) => f.section === label);
              const fieldCount = filtered?.length || 0;

              return fieldCount > 0 ? <div key={`section-${idx}`}>{renderSection(filtered, label)}</div> : null;
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
          </div>
        </div>
      </div>
    </form>
  );
};
