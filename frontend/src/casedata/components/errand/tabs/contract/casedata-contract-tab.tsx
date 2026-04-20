import { ContractData, UnifiedContractParty } from '@casedata/interfaces/contract-data';
import {
  Contract,
  ContractType,
  ExtraParameterGroup,
  IntervalType,
  InvoicedIn,
  LeaseType,
  Party,
  StakeholderRole,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  contractStakeholderToUnifiedParty,
  contractToKopeavtal,
  contractToLagenhetsArrende,
  contractTypes,
  defaultKopeavtal,
  defaultLagenhetsarrende,
  errandStakeholderToContractStakeholder,
  getErrandContract,
  isLeaseAgreement,
  leaseTypes,
  saveContract,
  saveContractToErrand,
  unifiedPartyToContractStakeholder,
} from '@casedata/services/contract-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import { Checkbox, FormControl, FormLabel, Input, Select, Spinner, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { Dispatch, FC, SetStateAction, useCallback, useEffect, useState } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';

import ContractForm from './contract-form';
import { ContractNavigation } from './contract-navigation';

interface CasedataContractProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
}

export const CasedataContractTab: FC<CasedataContractProps> = (props) => {
  let formSchema = yup
    .object({
      type: yup.string().required('Avtalstyp måste anges'),
      currentPeriod: yup.object().when(['type', 'status'], {
        is: (type: ContractType, status: Status) =>
          type !== ContractType.PURCHASE_AGREEMENT && status === Status.ACTIVE,
        then: (schema) =>
          schema.shape({
            startDate: yup.string().required('Startdatum måste anges'),
          }),
      }),
      notice: yup.object().when('type', {
        is: (type: ContractType) => type !== ContractType.PURCHASE_AGREEMENT,
        then: (schema) =>
          schema.shape({
            terms: yup
              .array()
              .of(
                yup.object({
                  party: yup.string().oneOf(Object.keys(Party)).required('Part måste väljas'),
                  periodOfNotice: yup.string().when('party', {
                    is: (party: string) => party === 'ALL',
                    then: (schema) => schema.required('Uppsägningstid måste anges'),
                    otherwise: (schema) => schema,
                  }),
                  unit: yup.string().oneOf(Object.keys(TimeUnit)).required('Enhet måste väljas'),
                })
              )
              .min(1),
          }),
        otherwise: (schema) => schema,
      }),
      extension: yup.object({
        autoExtend: yup.boolean(),
        leaseExtension: yup.string().when('autoExtend', {
          is: (autoExtend: boolean) => autoExtend,
          then: (schema) =>
            schema.required('Antal måste anges').test('notEmpty', 'Antal måste väljas', (val) => !!val && val !== ''),
          otherwise: (schema) => schema,
        }),
        unit: yup.mixed<string>().when('autoExtend', {
          is: (autoExtend: boolean) => autoExtend,
          then: (schema) => schema.oneOf(Object.keys(TimeUnit), 'Välj enhet').required('Enhet måste väljas'),
          otherwise: (schema) => schema,
        }),
      }),
      invoicing: yup.object({
        invoiceInterval: yup.mixed<string>().when('type', {
          is: (type: string) => type === ContractType.LEASE_AGREEMENT,
          then: (schema) =>
            schema.oneOf(Object.keys(IntervalType), 'Välj intervall').required('Intervall måste väljas'),
          otherwise: (schema) => schema,
        }),

        invoicedIn: yup.mixed<string>().when('type', {
          is: (type: string) => type === ContractType.LEASE_AGREEMENT,
          then: (schema) =>
            schema
              .oneOf(Object.keys(InvoicedIn), 'Välj förskott eller efterskott')
              .required('Förskott eller efterskott måste väljas'),
          otherwise: (schema) => schema,
        }),
      }),
    })
    .required();
  const [referensError, setReferensError] = useState(false);
  const { municipalityId, errand, user } = useAppContext();
  const [loading, setIsLoading] = useState<string>();
  const [existingContract, setExistingContract] = useState<ContractData | undefined>(undefined);
  const [contractParties, setContractParties] = useState<UnifiedContractParty[]>([]);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = errand ? validateAction(errand, user) : false;
    setAllowed(_a);
  }, [user, errand]);

  // Handler to add a new party
  const handleAddParty = useCallback(
    (stakeholderId: string, roles: StakeholderRole[]) => {
      const stakeholder = errand?.stakeholders?.find((s) => String(s.id) === stakeholderId);
      if (!stakeholder) return;

      const contractStakeholder = errandStakeholderToContractStakeholder(stakeholder, roles);
      const newParty = contractStakeholderToUnifiedParty(contractStakeholder);

      setContractParties((prev) => [...prev, newParty]);
      props.setUnsaved(true);
    },
    [errand?.stakeholders, props]
  );

  // Handler to edit party roles
  const handleEditPartyRoles = useCallback(
    (stakeholderId: string, newRoles: StakeholderRole[]) => {
      setContractParties((prev) =>
        prev.map((party) => {
          if (party.stakeholderId === stakeholderId) {
            return {
              ...party,
              roles: newRoles,
              originalStakeholder: {
                ...party.originalStakeholder,
                roles: newRoles,
              },
            };
          }
          return party;
        })
      );
      props.setUnsaved(true);
    },
    [props]
  );

  // Handler to remove a party
  const handleRemoveParty = useCallback(
    (stakeholderId: string) => {
      setContractParties((prev) => prev.filter((party) => party.stakeholderId !== stakeholderId));
      props.setUnsaved(true);
    },
    [props]
  );

  // Load parties from contract stakeholders
  useEffect(() => {
    if (existingContract?.stakeholders) {
      const parties = existingContract.stakeholders.map(contractStakeholderToUnifiedParty);
      setContractParties(parties);
    }
  }, [existingContract]);

  const contractForm = useForm<ContractData>({
    resolver: yupResolver(formSchema) as unknown as Resolver<ContractData>,
    defaultValues:
      existingContract?.type === ContractType.PURCHASE_AGREEMENT ? defaultKopeavtal : defaultLagenhetsarrende,
    mode: 'onSubmit',
  });

  const changeBadgeColor = (inId: string) => {
    let element = document.getElementById(inId);
    if (element !== null) {
      if (element.style.backgroundColor.includes('gray')) {
        element.style.backgroundColor = 'black';
      } else {
        element.style.backgroundColor = 'lightgray';
      }
    }
  };

  const onSave = async (data: ContractData, section?: string) => {
    if (section === 'billing' && data.generateInvoice === 'true') {
      setReferensError(false);
      const hasMarkup = (data.extraParameters ?? []).some((p) => p.parameters?.markup?.trim());
      if (!hasMarkup) {
        setReferensError(true);
        return;
      }
    }
    setIsLoading('Sparar avtal..');
    const isNewContract = !data.contractId;

    // Convert unified parties back to contract stakeholders
    const stakeholders = contractParties.map(unifiedPartyToContractStakeholder);

    // Set stakeholders directly on contract data
    const dataToSave: ContractData = {
      ...data,
      stakeholders,
    };

    return saveContract(dataToSave)
      .then(async (res: Contract) => {
        // Only save to errand if this is a new contract
        if (isNewContract && res.contractId) {
          await saveContractToErrand(municipalityId, res.contractId, errand!);
        }

        // Convert saved contract back to form data and reset the form
        const savedFormData = isLeaseAgreement(res.type) ? contractToLagenhetsArrende(res) : contractToKopeavtal(res);
        contractForm.reset(savedFormData);

        setIsLoading(undefined);
        props.setUnsaved(false);
        toastMessage(
          getToastOptions({
            message: 'Avtalet sparades',
            status: 'success',
          })
        );
      })
      .catch(() => {
        setIsLoading(undefined);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när avtalet skulle sparas',
          status: 'error',
        });
      });
  };

  useEffect(() => {
    if (errand) {
      const errandIdExtraParameter = {
        name: 'errandId',
        parameters: {
          errandId: errand.id.toString(),
        },
      };
      let newParams: ExtraParameterGroup[] = [];
      getErrandContract(errand)
        .then((res) => {
          if (res) {
            setExistingContract(res);
            contractForm.setValue('type', res.type);
            contractForm.setValue('leaseType', res.leaseType);
            contractForm.reset(res);
          }
          const oldParams = (res.extraParameters ?? []).filter((p) => p.name !== 'errandId');
          newParams = [...oldParams, errandIdExtraParameter];
        })
        .catch(() => {
          newParams = [errandIdExtraParameter];
          setExistingContract(undefined);
        })
        .finally(() => {
          contractForm.setValue('extraParameters', newParams);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const contractType = contractForm.watch('type') as ContractType;
  useEffect(() => {
    if (contractType && contractType !== ContractType.LEASE_AGREEMENT) {
      contractForm.setValue('leaseType', undefined);
    }
    contractForm.trigger('type');
  }, [contractType, contractForm]);

  return (
    <FormProvider {...contractForm}>
      <form
        onChange={() => {
          props.setUnsaved(true);
        }}
        data-cy="casedata-contract-form"
      >
        <div className="w-full py-24 px-32">
          <div className="flex">
            <div className="w-3/4" data-cy="contract-wrapper">
              <div>
                <h2 className="text-h2-md">
                  {contractTypes.find((ct) => ct.key === contractType)?.label}{' '}
                  <span>{contractForm.getValues().contractId ? `(${contractForm.getValues().contractId})` : null}</span>
                </h2>
                <p className="py-16">
                  Här fyller du i avtalsuppgifter för ärendet. Kom ihåg att granska uppgifterna noga så att allt är i
                  sin ordning inför signeringen. Notera att vissa uppgifter hämtas automatiskt från de uppgifter som
                  registrerats under ärendeuppgifter.
                </p>
              </div>
              <div className="flex justify-start gap-xl">
                <FormControl id="contractType" className="my-md">
                  <FormLabel>Välj avtalstyp</FormLabel>
                  <Select data-cy="contract-type-select" {...contractForm.register('type')}>
                    {contractTypes.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {contractForm.getValues().type === ContractType.LEASE_AGREEMENT && (
                  <FormControl id="contractSubType" className="my-md">
                    <FormLabel>Undertyp</FormLabel>
                    <Select data-cy="contract-subtype-select" {...contractForm.register('leaseType')}>
                      {leaseTypes
                        .filter((lt) => existingContract?.contractId || lt.key !== LeaseType.OTHER_FEE)
                        .map((lt) => (
                          <option key={lt.key} value={lt.key}>
                            {lt.label}
                          </option>
                        ))}
                    </Select>
                  </FormControl>
                )}
              </div>

              {contractForm.getValues().status === Status.DRAFT && (
                <FormControl id="isDraft" className="my-md">
                  <FormLabel>
                    Status på avtal {loading !== undefined && existingContract === undefined && <Spinner size={4} />}
                  </FormLabel>
                  <Checkbox
                    disabled={loading !== undefined || (errand ? isErrandLocked(errand) : false) || !allowed}
                    checked={true}
                    value={contractForm.getValues().status}
                    onChange={() => {
                      confirm
                        .showConfirmation(
                          'Bekräfta statusändring',
                          'När avtalet inte längre är ett utkast kan du inte redigera något annat än fakturareferens och fakturamottagare. Är du säker?',
                          'Ja',
                          'Nej',
                          'info',
                          'info'
                        )
                        .then((confirmed) => {
                          if (confirmed) {
                            contractForm.setValue('status', Status.ACTIVE);
                            contractForm.trigger().then((valid: boolean) => {
                              if (valid) {
                            onSave(contractForm.getValues());
                              } else {
                                contractForm.setValue('status', Status.DRAFT);
                              }
                            });
                          }
                        });
                    }}
                    indeterminate={false}
                  >
                    Markera som utkast
                  </Checkbox>
                  <p>Avmarkera när allt är klart med avtalet och faktureringen ska börja.</p>
                  {contractForm.formState.isValid === false && (
                    <p className="text-error">Avtalet saknar nödvändiga uppgifter.</p>
                  )}
                </FormControl>
              )}
              <Input type="hidden" readOnly {...contractForm.register('contractId')} />
              <ContractForm
                referensError={referensError}
                changeBadgeColor={changeBadgeColor}
                onSave={onSave}
                existingContract={(existingContract as ContractData) || defaultKopeavtal}
                contractParties={contractParties}
                contractStatus={existingContract?.status}
                errandStakeholders={errand?.stakeholders}
                onAddParty={handleAddParty}
                onEditPartyRoles={handleEditPartyRoles}
                onRemoveParty={handleRemoveParty}
              />
            </div>

            <ContractNavigation contractType={contractType} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
