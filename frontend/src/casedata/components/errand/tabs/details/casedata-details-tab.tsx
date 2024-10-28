import { MEXCaseType } from '@casedata/interfaces/case-type';
import { GenericExtraParameters } from '@casedata/interfaces/extra-parameters';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  UppgiftField,
  extraParametersToUppgiftMapper,
  saveExtraParameters,
} from '@casedata/services/casedata-extra-parameters-service';
import { saveFacilities } from '@casedata/services/casedata-facilities-service';
import Facilities from '@common/components/facilities/facilities';
import { useAppContext } from '@common/contexts/app.context';
import { FacilityDTO } from '@common/interfaces/facilities';
import { isMEX } from '@common/services/application-service';
import {
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  RadioButton,
  Select,
  Textarea,
  cx,
  useConfirm,
  useSnackbar,
} from '@sk-web-gui/react';
import { RegisterSupportErrandFormModel } from '@supportmanagement/interfaces/errand';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface CasedataDetailsProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
  registeringNewErrand: boolean;
}

export const specialSign = '@';

export const CasedataDetailsTab: React.FC<CasedataDetailsProps> = (props) => {
  const { municipalityId, errand, setErrand, user } = useAppContext();
  const [fields, setFields] = useState<UppgiftField[]>([]);
  const [loading, setIsLoading] = useState<string>();
  const toastMessage = useSnackbar();
  const saveConfirm = useConfirm();

  const [realEstates, setRealEstates] = useState<FacilityDTO[]>([]);
  const [showSpinner, setShowSpinner] = useState<boolean>(false);
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  // Handle dots i field name
  Object.keys(errand.extraParameters).map((key) => {
    const newKey = key.replace(/\./g, specialSign);
    errand.extraParameters[newKey] = errand.extraParameters[key];
  });

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
  } = useForm<RegisterSupportErrandFormModel & SupportErrand & any>({
    defaultValues: errand.extraParameters,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const [menuStatus, setMenuStatus] = useState([
    {
      label: 'Övergripande',
      openState: true,
    },
    {
      label: 'Datum',
      openState: false,
    },
    {
      label: 'Uppsägning',
      openState: false,
    },
    {
      label: 'Köpa & sälja',
      openState: false,
    },
    {
      label: 'Vägbidrag',
      openState: false,
    },
  ]);

  const openCloseDisclsure = (inLabel) => {
    const element = menuStatus.find((item) => item.label === inLabel);
    const elementIndex = menuStatus.findIndex((item) => item.label === inLabel);
    if (element.openState) {
      element.openState = false;
    } else {
      element.openState = true;
    }
    const newFeatures = [...menuStatus];
    newFeatures[elementIndex] = element;
    setMenuStatus(newFeatures);
  };

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

  const onSave = async (extraParams: GenericExtraParameters) => {
    if (isMEX()) {
      saveFacilities(municipalityId, errand.id, getValues().facilities);
    }

    saveExtraParameters(municipalityId, extraParams, errand).then((res) => {
      setIsLoading(undefined);
      props.setUnsaved(false);
      getErrand(municipalityId, errand.id.toString())
        .then((res) => {
          setErrand(res.errand);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Uppgifterna sparades',
            status: 'success',
          });
          setIsLoading(undefined);
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
    });
  };

  useEffect(() => {
    const uppgifter = extraParametersToUppgiftMapper(errand);
    const uppgifterFields: UppgiftField[] = uppgifter[errand.caseType];

    // Handle dots i field name
    uppgifterFields?.map((data, index) => {
      data.field = data.field.replace(/\./g, specialSign);
    });

    setFields(uppgifterFields ?? []);
    setRealEstates(errand.facilities);
  }, [errand]);

  const renderFormControl = (assignment: UppgiftField, idx: number) => {
    const dependent: boolean =
      assignment.dependsOn?.length > 0
        ? assignment.dependsOn.every((d) => getValues(d.field.replace(/\./g, specialSign)) === d.value)
        : true;
    return dependent ? (
      <FormControl className="w-full" key={`${assignment.field}-${idx}`} disabled={isErrandLocked(errand)}>
        {assignment.field === 'account2ownerIdentifier' ||
        assignment.field === 'account2owner' ||
        assignment.field === 'account2bank' ||
        assignment.field === 'account2number' ? null : (
          <FormLabel className="mt-lg">{assignment.label}</FormLabel>
        )}
        {assignment.formField.type === 'text' ||
        assignment.formField.type === 'date' ||
        assignment.formField.type === 'datetime-local' ? (
          errand.caseType !== 'MEX_APPLICATION_FOR_ROAD_ALLOWANCE' ? (
            <Input
              type={assignment.formField.type}
              {...register(assignment.field)}
              className={cx(assignment.formField.type === 'date' ? `w-1/2` : 'w-full')}
              data-cy={`${assignment.field}-input`}
            />
          ) : (
            <>
              {getValues('account@type') === 'Bankkonto' ? (
                <>
                  {assignment.label !== 'Giro-nummer' && assignment.label !== 'Giro-ägare' && (
                    <>
                      <FormLabel className="mt-lg">{assignment.label}</FormLabel>
                      <Input
                        type={assignment.formField.type}
                        {...register(assignment.field)}
                        className={cx(assignment.formField.type === 'date' ? `w-1/2` : 'w-full')}
                        data-cy={`${assignment.field}-input`}
                      />
                    </>
                  )}
                </>
              ) : (
                <>
                  {assignment.label !== 'Kontonummer' &&
                    assignment.label !== 'Kontoägarens personnummer' &&
                    assignment.label !== 'Kontoägare' && (
                      <>
                        <FormLabel className="mt-lg">{assignment.label}</FormLabel>
                        <Input
                          type={assignment.formField.type}
                          {...register(assignment.field)}
                          className={cx(assignment.formField.type === 'date' ? `w-1/2` : 'w-full')}
                          data-cy={`${assignment.field}-input`}
                        />
                      </>
                    )}
                </>
              )}
            </>
          )
        ) : assignment.formField.type === 'select' ? (
          <Select {...register(assignment.field)} className="w-content" data-cy={`${assignment.field}-select`}>
            <Select.Option value="">Välj</Select.Option>
            {assignment.formField.options.map((o, oIdx) => (
              <Select.Option key={`${o}-${oIdx}`} value={o.value}>
                {o.label}
              </Select.Option>
            ))}
          </Select>
        ) : assignment.formField.type === 'textarea' ? (
          <>
            <textarea
              rows={3}
              className="w-full rounded-12 p-md rows={3}-medium text-base"
              {...register(assignment.field)}
              data-cy={`${assignment.field}-textarea`}
            />
          </>
        ) : assignment.formField.type === 'radio' ? (
          <>
            <RadioButton.Group
              defaultValue={getValues(assignment.field)}
              data-cy={`${assignment.field}-radio-button-group`}
            >
              {assignment.formField.options.map((option, index) => (
                <RadioButton
                  value={option.value}
                  {...register(assignment.field)}
                  key={`${option}-${index}`}
                  data-cy={`${assignment.field}-radio-button-${index}`}
                >
                  {option.label}
                </RadioButton>
              ))}
            </RadioButton.Group>
          </>
        ) : assignment.formField.type === 'radioPlus' ? (
          <>
            <Input {...register(assignment.field)} hidden></Input>
            <RadioButton.Group
              defaultValue={
                assignment.formField.options.find((option) => option.value === getValues(assignment.field))?.value ||
                'ownOption'
              }
              data-cy={`${assignment.field}-radio-button-group`}
            >
              {assignment.formField.options.map((option, index) => (
                <RadioButton
                  value={option.value}
                  onClick={(event) => {
                    const element = event.currentTarget as HTMLInputElement;
                    setValue(assignment.field, element.value);
                  }}
                  key={`${option}-${index}`}
                  data-cy={`${assignment.field}-radio-button-${index}`}
                >
                  {option.label}
                </RadioButton>
              ))}

              <RadioButton
                checked={
                  assignment.formField.options.findIndex((option) => option.value === getValues(assignment.field)) ===
                  -1
                }
                value="ownOption"
                data-cy={`${assignment.field}-radio-button`}
              >
                {assignment.formField.ownOption}:
                <Input
                  onChange={(event) => {
                    setValue(assignment.field, event.target.value);
                  }}
                  value={
                    assignment.formField.options.findIndex((option) => option.value === getValues(assignment.field)) ===
                    -1
                      ? getValues(assignment.field)
                      : ''
                  }
                  data-cy={`${assignment.field}-input`}
                ></Input>
              </RadioButton>
            </RadioButton.Group>
          </>
        ) : assignment.formField.type === 'checkbox' ? (
          <>
            <Input {...register(assignment.field)} type="hidden"></Input>
            <Checkbox.Group direction="row">
              {assignment.formField.options.map((option, index) => (
                <Checkbox
                  value={option.name}
                  name={option.name}
                  key={`${option}-${index}`}
                  data-cy={`${assignment.field}-checkbox-${index}`}
                  onChange={(val) => {
                    const splitValues: string[] =
                      getValues(assignment.field)
                        ?.split(',')
                        ?.filter((v) => v !== '' && v !== ' ') || [];
                    const uniqueValues = val.currentTarget.checked
                      ? [...splitValues, option.value]
                      : splitValues.filter((v) => v !== option.value);
                    setValue(assignment.field, uniqueValues.join());
                  }}
                  defaultChecked={getValues(assignment.field)?.split(',').includes(option.value)}
                >
                  {option.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </>
        ) : null}
      </FormControl>
    ) : null;
  };

  const renderSection = (fields: UppgiftField[], label: string) => {
    return (
      <div className="my-lg">
        {fields?.map(renderFormControl)}
        <Button
          key={`section-${label}`}
          variant="primary"
          disabled={isErrandLocked(errand) || !allowed}
          onClick={() => {
            try {
              const data = {};
              fields.forEach((f) => {
                if (f.field.indexOf(specialSign) !== -1) {
                  // Insert dots
                  const replaceField = f.field.replaceAll(specialSign, '.');
                  data[replaceField] = getValues()[f.field];
                } else {
                  data[f.field] = getValues()[f.field];
                }
              });
              data['propertyDesignation'] = getValues('propertyDesignation');

              saveConfirm.showConfirmation('Spara uppgifterna', 'Vill du spara uppgifterna?').then((confirmed) => {
                if (confirmed) {
                  setIsLoading(label);
                  onSave(data);
                }
                return confirmed ? () => true : () => {};
              });
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
            {isMEX() ? (
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
            ].map(({ label, icon }, idx) => {
              const filtered = fields?.filter((f) => f.section === label);
              const fieldCount = filtered?.length || 0;
              let nonEmptyFieldCount = filtered
                ?.map((f) => getValues()?.[f.field.split('.')[0]] !== '')
                .filter(Boolean).length;

              return fieldCount > 0 ? (
                // <Disclosure
                //   key={`disclosure-${idx}`}
                //   icon={icon as any}
                //   header={<h2 className="text-h4-sm md:text-h4-md">{label}</h2>}
                //   label={`${nonEmptyFieldCount} av ${fieldCount}`}
                //   labelColor={fieldCount > nonEmptyFieldCount ? `warning` : `gronsta`}
                //   color="gronsta"
                //   variant="alt"
                //   onToggleOpen={() => {
                //     openCloseDisclsure(label);
                //   }}
                //   open={menuStatus.find((item) => item.label === label).openState}
                // >
                <div key={`section-${idx}`}>
                  {/* {renderDefaultFields()} */}
                  {renderSection(filtered, label)}
                </div>
              ) : // </Disclosure>
              null;
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
          {/* <div className="w-1/5 pl-40 lg:block hidden">
            {fields.length !== 0 ? <h2 className="text-h4-sm md:text-h4-md mb-md">Innehåll</h2> : null}
            {[
              {
                label: 'Övergripande',
              },
              {
                label: 'Datum',
              },
              {
                label: 'Uppsägning',
              },
              {
                label: 'Köpa & sälja',
              },
              {
                label: 'Vägbidrag',
              },
            ].map(({ label }, idx) => {
              const filtered = fields?.filter((f) => f.section === label);
              const fieldCount = filtered?.length || 0;
              return fieldCount > 0 ? (
                <div className="flex gap-12 items-center mb-7" key={idx}>
                  <Badge
                    id={'badge-' + label}
                    rounded
                    className="!max-w-[10px] !min-w-[10px] !max-h-[10px] !min-h-[10px]"
                    style={
                      menuStatus.find((item) => item.label === label).openState
                        ? { backgroundColor: 'black' }
                        : { backgroundColor: 'lightgray' }
                    }
                  />
                  <Link
                    variant="tertiary"
                    href="#"
                    alt={'Öppna ' + label}
                    onClick={() => {
                      openCloseDisclsure(label);
                    }}
                  >
                    {label}
                  </Link>
                </div>
              ) : null;
            })}
          </div> */}
        </div>
      </div>
    </form>
  );
};
