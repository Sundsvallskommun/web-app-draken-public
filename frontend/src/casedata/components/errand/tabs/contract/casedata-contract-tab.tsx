import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import {
  Contract,
  ContractType,
  ExtraParameterGroup,
  IntervalType,
  InvoicedIn,
  Party,
  StakeholderRole,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import {
  casedataStakeholderToContractStakeholder,
  contractTypes,
  defaultKopeavtal,
  defaultLagenhetsarrende,
  getErrandContract,
  isLeaseAgreement,
  leaseTypes,
  saveContract,
  saveContractToErrand,
} from '@casedata/services/contract-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import { Checkbox, FormControl, FormLabel, Input, Select, Spinner, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';
import ContractForm from './contract-form';
import { ContractNavigation } from './contract-navigation';

interface CasedataContractProps {
  update: () => void;
  setUnsaved: Dispatch<SetStateAction<boolean>>;
}

export const CasedataContractTab: React.FC<CasedataContractProps> = (props) => {
  let formSchema = yup
    .object({
      type: yup.string().required('Avtalstyp måste anges'),
      notice: yup.object().when('type', {
        is: (type: ContractType) => type !== ContractType.PURCHASE_AGREEMENT,
        then: (schema) =>
          schema.shape({
            terms: yup
              .array()
              .of(
                yup.object({
                  party: yup.string().oneOf(Object.keys(Party)).required('Part måste väljas'),
                  periodOfNotice: yup.string().required('Antal måste anges'),
                  unit: yup.string().oneOf(Object.keys(TimeUnit)).required('Enhet måste väljas'),
                })
              )
              .min(2),
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
  const { municipalityId, errand, user } = useAppContext();
  const [loading, setIsLoading] = useState<string>();
  const [existingContract, setExistingContract] = useState<ContractData | undefined>(undefined);
  const [sellers, setSellers] = useState<StakeholderWithPersonnumber[]>([]);
  const [buyers, setBuyers] = useState<StakeholderWithPersonnumber[]>([]);
  const [lessees, setLessees] = useState<StakeholderWithPersonnumber[]>([]);
  const [lessors, setLessors] = useState<StakeholderWithPersonnumber[]>([]);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = errand ? validateAction(errand, user) : false;
    setAllowed(_a);
  }, [user, errand]);

  // Manual party selection handlers
  const handleSetLessors = (selectedIds: string[]) => {
    const selected: StakeholderWithPersonnumber[] = (errand?.stakeholders ?? [])
      .filter((s) => selectedIds.includes(String(s.id)))
      .map(casedataStakeholderToContractStakeholder);
    selected.forEach((s) => {
      s.roles = [StakeholderRole.LESSOR];
    });
    setLessors(selected);
  };

  const handleSetLessees = (selectedIds: string[]) => {
    const selected: StakeholderWithPersonnumber[] = (errand?.stakeholders ?? [])
      .filter((s) => selectedIds.includes(String(s.id)))
      .map(casedataStakeholderToContractStakeholder);
    selected.forEach((s) => {
      s.roles = [StakeholderRole.LESSEE];
    });
    setLessees(selected);
  };

  const handleSetBillingParties = (selectedStakeholderIds: string[]) => {
    // Update lessees to add/remove PRIMARY_BILLING_PARTY role
    // Uses stakeholderId for matching since all saved stakeholders have an id
    const updatedLessees = lessees.map((l, index) => {
      // Match by stakeholderId, falling back to index for edge cases
      const identifier = l.stakeholderId || String(index);
      const shouldBeBilling = selectedStakeholderIds.includes(identifier);
      const rolesWithoutBilling = (l.roles ?? []).filter((r) => r !== StakeholderRole.PRIMARY_BILLING_PARTY);
      return {
        ...l,
        roles: shouldBeBilling ? [...rolesWithoutBilling, StakeholderRole.PRIMARY_BILLING_PARTY] : rolesWithoutBilling,
      };
    });
    setLessees(updatedLessees);
  };

  const handleSetBuyers = (selectedIds: string[]) => {
    const selected: StakeholderWithPersonnumber[] = (errand?.stakeholders ?? [])
      .filter((s) => selectedIds.includes(String(s.id)))
      .map(casedataStakeholderToContractStakeholder);
    selected.forEach((s) => {
      s.roles = [StakeholderRole.BUYER];
    });
    setBuyers(selected);
  };

  const handleSetSellers = (selectedIds: string[]) => {
    const selected: StakeholderWithPersonnumber[] = (errand?.stakeholders ?? [])
      .filter((s) => selectedIds.includes(String(s.id)))
      .map(casedataStakeholderToContractStakeholder);
    selected.forEach((s) => {
      s.roles = [StakeholderRole.SELLER];
    });
    setSellers(selected);
  };

  const getStakeholdersFromContract = (contract: ContractData) => {
    let _sellers: StakeholderWithPersonnumber[] = [];
    let _buyers: StakeholderWithPersonnumber[] = [];
    let _lessees: StakeholderWithPersonnumber[] = [];
    let _lessors: StakeholderWithPersonnumber[] = [];
    if (contract.type === ContractType.PURCHASE_AGREEMENT) {
      _sellers = contract.sellers ?? [];
      _buyers = contract.buyers ?? [];
    } else if (isLeaseAgreement(contract.type)) {
      _lessees = contract.lessees ?? [];
      _lessors = contract.lessors ?? [];
    }
    setSellers(_sellers);
    setBuyers(_buyers);
    setLessees(_lessees);
    setLessors(_lessors);
  };

  useEffect(() => {
    if (existingContract?.contractId) {
      getStakeholdersFromContract(existingContract);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, existingContract]);

  const contractForm = useForm<ContractData>({
    resolver: yupResolver(formSchema) as unknown as Resolver<ContractData>,
    defaultValues:
      existingContract?.type === ContractType.PURCHASE_AGREEMENT ? defaultKopeavtal : defaultLagenhetsarrende,
    mode: 'onChange',
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

  const onSave = async (data: ContractData) => {
    setIsLoading('Sparar avtal..');
    const isNewContract = !data.contractId;

    return saveContract(data)
      .then(async (res: Contract) => {
        // Only save to errand if this is a new contract
        if (isNewContract && res.contractId) {
          await saveContractToErrand(municipalityId, res.contractId, errand!);
          // Update the form with the new contractId
          contractForm.setValue('contractId', res.contractId);
        }
        return res;
      })
      .then(() => {
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
    contractForm.trigger();
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
                      {leaseTypes.map((lt) => (
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
                            contractForm.trigger('status');
                            onSave(contractForm.getValues());
                          }
                        });
                    }}
                    indeterminate={false}
                  >
                    Markera som utkast
                  </Checkbox>
                  <p>Avmarkera när allt är klart med avtalet och faktureringen ska börja.</p>
                </FormControl>
              )}
              <Input type="hidden" readOnly {...contractForm.register('contractId')} />
              <ContractForm
                changeBadgeColor={changeBadgeColor}
                onSave={onSave}
                existingContract={(existingContract as ContractData) || defaultKopeavtal}
                sellers={sellers}
                buyers={buyers}
                lessees={lessees}
                lessors={lessors}
                contractStatus={existingContract?.status}
                errandStakeholders={errand?.stakeholders}
                onSetLessors={handleSetLessors}
                onSetLessees={handleSetLessees}
                onSetBillingParties={handleSetBillingParties}
                onSetBuyers={handleSetBuyers}
                onSetSellers={handleSetSellers}
              />
            </div>

            <ContractNavigation contractType={contractType} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
