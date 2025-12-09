import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import {
  Contract,
  ContractType,
  IntervalType,
  InvoicedIn,
  Party,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { Role } from '@casedata/interfaces/role';
import { getErrand, isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { getStakeholdersByRelation } from '@casedata/services/casedata-stakeholder-service';
import {
  casedataStakeholderToContractStakeholder,
  contractTypes,
  defaultKopeavtal,
  defaultLagenhetsarrende,
  getErrandContract,
  leaseTypes,
  saveContract,
  saveContractToErrand,
} from '@casedata/services/contract-service';
import { User } from '@common/interfaces/user';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import { Checkbox, FormControl, FormLabel, Input, Select, Spinner, useSnackbar } from '@sk-web-gui/react';
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
      notices: yup.array().when('type', {
        is: (type: ContractType) => type === ContractType.LEASE_AGREEMENT,
        then: (schema) =>
          schema
            .of(
              yup.object({
                party: yup.string().oneOf(Object.keys(Party)).required('Part måste väljas'),
                periodOfNotice: yup.string().required('Antal måste anges'),
                unit: yup.string().oneOf(Object.keys(TimeUnit)).required('Enhet måste väljas'),
              })
            )
            .min(2),
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
  const {
    municipalityId,
    errand,
    setErrand,
    user,
  }: { municipalityId: string; errand: IErrand; setErrand: Dispatch<SetStateAction<IErrand>>; user: User } =
    useAppContext();
  const [loading, setIsLoading] = useState<string>();
  const [existingContract, setExistingContract] = useState<ContractData>(undefined);
  const [sellers, setSellers] = useState<StakeholderWithPersonnumber[]>([]);
  const [buyers, setBuyers] = useState<StakeholderWithPersonnumber[]>([]);
  const [lessees, setLessees] = useState<StakeholderWithPersonnumber[]>([]);
  const [lessors, setLessors] = useState<StakeholderWithPersonnumber[]>([]);
  const toastMessage = useSnackbar();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const updateStakeholdersFromErrand = () => {
    const _sellers: StakeholderWithPersonnumber[] = getStakeholdersByRelation(errand, Role.SELLER).map(
      casedataStakeholderToContractStakeholder
    );
    const _buyers: StakeholderWithPersonnumber[] = getStakeholdersByRelation(errand, Role.BUYER).map(
      casedataStakeholderToContractStakeholder
    );
    const _lessees: StakeholderWithPersonnumber[] = getStakeholdersByRelation(errand, Role.LEASEHOLDER).map(
      casedataStakeholderToContractStakeholder
    );
    const _lessors: StakeholderWithPersonnumber[] = getStakeholdersByRelation(errand, Role.PROPERTY_OWNER).map(
      casedataStakeholderToContractStakeholder
    );
    setSellers(_sellers || []);
    setBuyers(_buyers || []);
    setLessees(_lessees || []);
    setLessors(_lessors || []);
  };

  const getStakeholdersFromContract = (contract: ContractData) => {
    let _sellers: StakeholderWithPersonnumber[] = [];
    let _buyers: StakeholderWithPersonnumber[] = [];
    let _lessees: StakeholderWithPersonnumber[] = [];
    let _lessors: StakeholderWithPersonnumber[] = [];
    if (contract.type === ContractType.PURCHASE_AGREEMENT) {
      _sellers = (contract as ContractData).sellers;
      _buyers = (contract as ContractData).buyers;
    } else if (contract.type === ContractType.LEASE_AGREEMENT) {
      _lessees = (contract as ContractData).lessees || [];
      _lessors = (contract as ContractData).lessors || [];
    }
    setSellers(_sellers);
    setBuyers(_buyers);
    setLessees(_lessees);
    setLessors(_lessors);
  };

  useEffect(() => {
    if (existingContract?.contractId) {
      getStakeholdersFromContract(existingContract);
    } else {
      updateStakeholdersFromErrand();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, existingContract]);

  const contractForm = useForm<ContractData>({
    resolver: yupResolver(formSchema) as Resolver<ContractData>,
    defaultValues:
      existingContract?.type === ContractType.PURCHASE_AGREEMENT
        ? defaultKopeavtal
        : existingContract?.type === ContractType.LEASE_AGREEMENT
        ? defaultLagenhetsarrende
        : ({ ...defaultKopeavtal, ...defaultLagenhetsarrende, type: ContractType.PURCHASE_AGREEMENT } as ContractData),
    mode: 'onChange',
  });

  const changeBadgeColor = (inId) => {
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
    return saveContract(data)
      .then(async (res: Contract) => {
        await saveContractToErrand(municipalityId, res.contractId, errand);
        return res;
      })
      .then((res) => {
        setIsLoading(undefined);
        props.setUnsaved(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => {
          setErrand(res.errand);
          toastMessage(
            getToastOptions({
              message: 'Avtalet sparades',
              status: 'success',
            })
          );
          setIsLoading(undefined);
        });
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
      let newParams = [];
      getErrandContract(errand)
        .then((res) => {
          if (res) {
            setExistingContract(res);
            contractForm.setValue('type', res.type);
            contractForm.setValue('leaseType', res.leaseType);
            contractForm.reset(res);
          }
          const oldParams = res.extraParameters.filter((p) => p.name !== 'errandId');
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
            <div className="w-3/4">
              <div>
                <h2 className="text-h2-md">{contractTypes.find((ct) => ct.key === contractType)?.label}</h2>
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
                      <option key={t.key} value={t.key as ContractType}>
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

              <FormControl id="isDraft" className="my-md">
                <FormLabel>
                  Status på avtal {loading !== undefined && existingContract === undefined && <Spinner size={4} />}
                </FormLabel>
                <Checkbox
                  disabled={loading !== undefined || isErrandLocked(errand) || !allowed}
                  checked={contractForm.getValues().status === 'DRAFT' ? true : false}
                  value={contractForm.getValues().status}
                  onChange={() => {
                    contractForm.setValue(
                      'status',
                      contractForm.getValues()?.status === Status.ACTIVE ? Status.DRAFT : Status.ACTIVE
                    );
                    contractForm.trigger('status');
                    onSave(contractForm.getValues());
                  }}
                  indeterminate={false}
                >
                  Markera som utkast
                </Checkbox>
                <p>Avmarkera när allt är klart med avtalet och faktureringen ska börja.</p>
              </FormControl>
              <Input type="hidden" readOnly name="id" {...contractForm.register('contractId')} />
              <ContractForm
                changeBadgeColor={changeBadgeColor}
                onSave={onSave}
                existingContract={(existingContract as ContractData) || defaultKopeavtal}
                sellers={sellers}
                buyers={buyers}
                lessees={lessees}
                lessors={lessors}
                updateStakeholders={updateStakeholdersFromErrand}
              />
            </div>

            <ContractNavigation contractType={contractType} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
