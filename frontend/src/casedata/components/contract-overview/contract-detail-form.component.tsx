import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import {
  Contract,
  ContractType,
  StakeholderRole,
  Status,
  Stakeholder as ContractStakeholder,
  StakeholderType as ContractStakeholderType,
} from '@casedata/interfaces/contracts';
import {
  contractToKopeavtal,
  contractToLagenhetsArrende,
  contractTypes,
  leaseTypes,
} from '@casedata/services/contract-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Checkbox, FormControl, FormLabel, Select, useConfirm, useSnackbar } from '@sk-web-gui/react';
import React, { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ContractForm } from '@casedata/components/errand/tabs/contract/contract-form';
import { useRouter } from 'next/navigation';
import { MEXCaseType } from '@casedata/interfaces/case-type';
import { Channels } from '@casedata/interfaces/channels';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { Priority } from '@casedata/interfaces/priority';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { IErrand } from '@casedata/interfaces/errand';
import { saveErrand, getErrand } from '@casedata/services/casedata-errand-service';
import { saveExtraParameters } from '@casedata/services/casedata-extra-parameters-service';
import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact, StakeholderType } from '@casedata/interfaces/stakeholder';
import { setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@contexts/app.context';
import { Admin } from '@common/services/user-service';

const getContractTypeLabel = (type: ContractType): string => {
  return contractTypes.find((t) => t.key === type)?.label || 'Avtal';
};

// Map contract stakeholder roles to errand roles
const mapContractRoleToErrandRole = (contractRole: StakeholderRole): Role | null => {
  const roleMapping: Record<StakeholderRole, Role | null> = {
    [StakeholderRole.LESSOR]: Role.PROPERTY_OWNER,
    [StakeholderRole.LESSEE]: Role.LEASEHOLDER,
    [StakeholderRole.BUYER]: Role.BUYER,
    [StakeholderRole.SELLER]: Role.SELLER,
    [StakeholderRole.CONTACT_PERSON]: Role.CONTACT_PERSON,
    [StakeholderRole.PROPERTY_OWNER]: Role.PROPERTY_OWNER,
    [StakeholderRole.LAND_RIGHT_OWNER]: Role.LAND_RIGHT_OWNER,
    [StakeholderRole.GRANTOR]: Role.GRANTOR,
    [StakeholderRole.LEASEHOLDER]: Role.LEASEHOLDER,
    [StakeholderRole.SIGNATORY]: Role.COMPANY_SIGNATORY,
    [StakeholderRole.PRIMARY_BILLING_PARTY]: Role.INVOICE_RECIPENT,
    [StakeholderRole.POWER_OF_ATTORNEY_CHECK]: null,
    [StakeholderRole.POWER_OF_ATTORNEY_ROLE]: null,
  };
  return roleMapping[contractRole] ?? null;
};

const mapContractStakeholderToErrandStakeholder = (
  contractStakeholder: ContractStakeholder
): CasedataOwnerOrContact | null => {
  const mappedRoles = (contractStakeholder.roles || [])
    .map(mapContractRoleToErrandRole)
    .filter((role): role is Role => role !== null);

  if (mappedRoles.length === 0) {
    return null;
  }

  // Use as the primary role either one of the main roles or the first role
  const primaryRole =
    mappedRoles.find((r) => r == Role.PROPERTY_OWNER || r == Role.LEASEHOLDER || r == Role.BUYER || r == Role.SELLER) ||
    mappedRoles[0];

  // Map type
  const stakeholderType: StakeholderType =
    contractStakeholder.type === ContractStakeholderType.ORGANIZATION ||
    contractStakeholder.type === ContractStakeholderType.MUNICIPALITY ||
    contractStakeholder.type === ContractStakeholderType.ASSOCIATION ||
    contractStakeholder.type === ContractStakeholderType.REGION
      ? ContractStakeholderType.ORGANIZATION
      : contractStakeholder.type === ContractStakeholderType.PERSON ||
        contractStakeholder.type === ContractStakeholderType.OTHER
      ? ContractStakeholderType.PERSON
      : contractStakeholder.type;

  // Map phone numbers
  const phoneNumbers: { value: string }[] = [];
  if (contractStakeholder.phoneNumber) {
    phoneNumbers.push({ value: contractStakeholder.phoneNumber });
  }

  // Map emails
  const emails: { value: string }[] = [];
  if (contractStakeholder.emailAddress) {
    emails.push({ value: contractStakeholder.emailAddress });
  }

  return {
    id: '',
    stakeholderType,
    roles: mappedRoles,
    newRole: primaryRole,
    firstName: contractStakeholder.firstName || '',
    lastName: contractStakeholder.lastName || '',
    organizationName: contractStakeholder.organizationName || '',
    organizationNumber: contractStakeholder.organizationNumber || '',
    personId: contractStakeholder.partyId || '',
    street: contractStakeholder.address?.streetAddress || '',
    careof: contractStakeholder.address?.careOf || '',
    zip: contractStakeholder.address?.postalCode || '',
    city: contractStakeholder.address?.town || '',
    phoneNumbers,
    newPhoneNumber: '',
    emails,
    newEmail: '',
  };
};

export const ContractDetailForm: React.FC<{
  selectedContract: Contract;
  update?: (contractId: string) => void;
}> = ({ selectedContract }) => {
  const { municipalityId, user, administrators }: { municipalityId: string; user: any; administrators: Admin[] } =
    useAppContext();

  const contractData = useMemo<ContractData>(() => {
    if (selectedContract.type === ContractType.PURCHASE_AGREEMENT) {
      return contractToKopeavtal(selectedContract);
    } else {
      return contractToLagenhetsArrende(selectedContract);
    }
  }, [selectedContract]);

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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const router = useRouter();

  const contractTypeLabel = getContractTypeLabel(selectedContract.type);
  const isDraft = selectedContract.status === Status.DRAFT;

  const handleChangeBillingDetails = async () => {
    const confirmed = await confirm.showConfirmation(
      'Ändra faktureringsuppgifter',
      `Vill du skapa ett nytt ärende för att ändra faktureringsuppgifter för avtal ${selectedContract.contractId}?`,
      'Ja, skapa ärende',
      'Avbryt',
      'info'
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);

    try {
      const mappedStakeholders = (selectedContract.stakeholders || [])
        .map(mapContractStakeholderToErrandStakeholder)
        .filter((s): s is CasedataOwnerOrContact => s !== null);

      const newErrandData: Partial<IErrand> & { municipalityId: string } = {
        caseType: MEXCaseType.MEX_OTHER,
        channel: Channels.WEB_UI,
        phase: ErrandPhase.aktualisering,
        priority: Priority.MEDIUM,
        status: { statusType: ErrandStatus.ArendeInkommit },
        municipalityId: municipalityId,
        description: `Ändra faktureringsuppgifter för avtal ${selectedContract.contractId}`,
        stakeholders: mappedStakeholders,
      };

      const result = await saveErrand(newErrandData);

      if (!result.errandSuccessful || !result.errandId) {
        throw new Error('Failed to create errand');
      }

      const createdErrand = await getErrand(municipalityId, result.errandId);

      if (!createdErrand.errand) {
        throw new Error('Failed to fetch created errand');
      }

      const admin = administrators.find((a) => a.adAccount === user.username);
      if (admin) {
        await setAdministrator(municipalityId, createdErrand.errand, admin);
      }

      const contractIdParam: ExtraParameter = {
        key: 'contractId',
        values: [selectedContract.contractId],
      };

      await saveExtraParameters(municipalityId, [contractIdParam], createdErrand.errand);

      toastMessage(
        getToastOptions({
          message: 'Ärende skapat',
          status: 'success',
        })
      );

      router.push(`/arende/${createdErrand.errand.errandNumber}`);
    } catch (error) {
      console.error('Error creating billing change errand:', error);
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när ärendet skulle skapas',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
            disabled={isLoading || !selectedContract.contractId}
            loading={isLoading}
            loadingText="Skapar ärende..."
            onClick={handleChangeBillingDetails}
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
