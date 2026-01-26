import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import { Contract, ContractType, StakeholderRole, Status } from '@casedata/interfaces/contracts';
import {
  contractToKopeavtal,
  contractToLagenhetsArrende,
  contractTypes,
  leaseTypes,
} from '@casedata/services/contract-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, FormControl, FormLabel, Select } from '@sk-web-gui/react';
import React, { useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ContractForm } from '@casedata/components/errand/tabs/contract/contract-form';

const getContractTypeLabel = (type: ContractType): string => {
  return contractTypes.find((t) => t.key === type)?.label || 'Avtal';
};

export const ContractDetailForm: React.FC<{
  selectedContract: Contract;
  update?: (contractId: string) => void;
}> = ({ selectedContract, update }) => {
  // Transform Contract to ContractData and split stakeholders
  const contractData = useMemo<ContractData>(() => {
    if (selectedContract.type === ContractType.PURCHASE_AGREEMENT) {
      return contractToKopeavtal(selectedContract);
    } else {
      return contractToLagenhetsArrende(selectedContract);
    }
  }, [selectedContract]);

  // Extract stakeholders by role
  const lessors = useMemo<StakeholderWithPersonnumber[]>(
    () => (selectedContract.stakeholders || []).filter((s) => s.roles?.includes(StakeholderRole.LESSOR)),
    [selectedContract.stakeholders]
  );

  const lessees = useMemo<StakeholderWithPersonnumber[]>(
    () => (selectedContract.stakeholders || []).filter((s) => s.roles?.includes(StakeholderRole.LESSEE)),
    [selectedContract.stakeholders]
  );

  const buyers = useMemo<StakeholderWithPersonnumber[]>(
    () => (selectedContract.stakeholders || []).filter((s) => s.roles?.includes(StakeholderRole.BUYER)),
    [selectedContract.stakeholders]
  );

  const sellers = useMemo<StakeholderWithPersonnumber[]>(
    () => (selectedContract.stakeholders || []).filter((s) => s.roles?.includes(StakeholderRole.SELLER)),
    [selectedContract.stakeholders]
  );

  const formControls = useForm<ContractData>({
    defaultValues: contractData,
    mode: 'onSubmit',
  });

  const contractTypeLabel = getContractTypeLabel(selectedContract.type);
  const isDraft = selectedContract.status === Status.DRAFT;

  return (
    <div className="px-40 my-lg gap-24">
      <div className="flex flex-col gap-md mb-32">
        <div className="flex justify-between items-center">
          <h2 className="text-h4-sm m-0">{contractTypeLabel}</h2>
          <Button
            data-cy="contract-detail-edit-button"
            color="vattjom"
            variant="primary"
            leftIcon={<LucideIcon name="external-link" />}
            disabled
          >
            Ändra faktureringsuppgifter
          </Button>
        </div>

        <p className="text-small text-dark-secondary m-0">
          Här fyller du i avtalsuppgifter för ärendet. Kom ihåg att granska uppgifterna noga så att allt är i sin
          ordning inför signeringen. Notera att vissa uppgifter hämtas automatiskt från de uppgifter som registrerats
          under ärendeuppgifter.
        </p>

        <div className="flex gap-lg">
          <FormControl id="contractType" className="flex-1">
            <FormLabel>Välj avtalstyp</FormLabel>
            <Select data-cy="contract-detail-type-select" className="w-full" value={selectedContract.type} disabled>
              {contractTypes.map((ct) => (
                <Select.Option key={ct.key} value={ct.key}>
                  {ct.label}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          {selectedContract.type === ContractType.LEASE_AGREEMENT && (
            <FormControl id="contractSubType" className="flex-1">
              <FormLabel>Undertyp</FormLabel>
              <Select
                data-cy="contract-detail-subtype-select"
                className="w-full"
                value={selectedContract.leaseType || ''}
                disabled
              >
                {leaseTypes.map((lt) => (
                  <Select.Option key={lt.key} value={lt.key}>
                    {lt.label}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          )}
        </div>

        <Checkbox data-cy="contract-detail-draft-checkbox" checked={isDraft} disabled>
          Markera som utkast
        </Checkbox>
      </div>

      <div className="flex flex-col gap-md mb-32">
        <FormProvider {...formControls}>
          <ContractForm
            readOnly={true}
            existingContract={contractData}
            buyers={buyers}
            sellers={sellers}
            lessees={lessees}
            lessors={lessors}
          />
        </FormProvider>
      </div>
    </div>
  );
};
