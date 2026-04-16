import { UnifiedContractParty } from '@casedata/interfaces/contract-data';
import { ContractType, StakeholderRole } from '@casedata/interfaces/contracts';
import { Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { isLeaseAgreement, prettyContractRoles } from '@casedata/services/contract-service';
import { Button, Checkbox, FormControl, FormLabel, Modal, Select } from '@sk-web-gui/react';
import React, { useEffect, useState } from 'react';

interface ContractPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stakeholderId: string, roles: StakeholderRole[]) => void;
  mode: 'add' | 'edit';
  stakeholderOptions: CasedataOwnerOrContact[];
  existingParty?: UnifiedContractParty;
  contractType: ContractType;
  existingParties?: UnifiedContractParty[];
}

export const ContractPartyModal: React.FC<ContractPartyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  mode,
  stakeholderOptions,
  existingParty,
  contractType,
  existingParties = [],
}) => {
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<StakeholderRole[]>([]);

  // Get available roles based on contract type
  const getAvailableRoles = (): StakeholderRole[] => {
    if (contractType === ContractType.PURCHASE_AGREEMENT) {
      return [StakeholderRole.BUYER, StakeholderRole.SELLER];
    }
    if (isLeaseAgreement(contractType)) {
      return [StakeholderRole.LESSEE, StakeholderRole.LESSOR, StakeholderRole.PRIMARY_BILLING_PARTY];
    }
    return [];
  };

  const availableRoles = getAvailableRoles();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && existingParty) {
        setSelectedStakeholderId(existingParty.stakeholderId);
        setSelectedRoles(existingParty.roles);
      } else {
        setSelectedStakeholderId('');
        setSelectedRoles([]);
      }
    }
  }, [isOpen, mode, existingParty]);

  const handleRoleToggle = (role: StakeholderRole) => {
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        return prev.filter((r) => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSave = () => {
    if (selectedStakeholderId && selectedRoles.length > 0) {
      onSave(selectedStakeholderId, selectedRoles);
      onClose();
    }
  };

  // Helper to get stakeholder display name
  const getStakeholderLabel = (s: CasedataOwnerOrContact): string => {
    if (s.stakeholderType === 'ORGANIZATION') {
      return s.organizationName ?? '';
    }
    return `${s.firstName} ${s.lastName}`.trim();
  };

  // Helper to check if a stakeholder matches an existing party
  const stakeholderMatchesParty = (s: CasedataOwnerOrContact, p: UnifiedContractParty): boolean => {
    // Match by organization number for organizations
    if (s.stakeholderType === 'ORGANIZATION' && s.organizationNumber && p.organizationNumber) {
      return s.organizationNumber === p.organizationNumber;
    }
    // Match by person ID for persons
    if (s.personId && p.personalNumber) {
      return s.personId === p.personalNumber;
    }
    // Fallback: match by name
    const stakeholderName =
      s.stakeholderType === 'ORGANIZATION' ? s.organizationName : `${s.firstName} ${s.lastName}`.trim();
    return stakeholderName === p.name;
  };

  // Filter stakeholder options for dropdown
  // Exclude administrators and stakeholders already added (in add mode)
  const filteredStakeholderOptions = stakeholderOptions
    .filter((s) => s.id && !s.roles.includes(Role.ADMINISTRATOR))
    .filter((s) => {
      if (mode === 'add') {
        // In add mode, exclude stakeholders that are already parties
        return !existingParties.some((p) => stakeholderMatchesParty(s, p));
      }
      return true;
    });

  return (
    <Modal
      show={isOpen}
      onClose={onClose}
      label={mode === 'add' ? 'Lägg till ny part' : 'Redigera roll'}
      className="w-full max-w-prose"
    >
      <Modal.Content>
        <div className="flex flex-col gap-24">
          {mode === 'add' ? (
            <FormControl>
              <FormLabel>Intressent</FormLabel>
              <Select
                data-cy="party-modal-stakeholder-select"
                value={selectedStakeholderId}
                onChange={(e) => setSelectedStakeholderId(e.target.value)}
              >
                <Select.Option value="">Välj intressent...</Select.Option>
                {filteredStakeholderOptions.map((s) => (
                  <Select.Option key={s.id} value={String(s.id)}>
                    {getStakeholderLabel(s) || '(namn saknas)'}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
          ) : (
            <div>
              <FormLabel>Intressent</FormLabel>
              <div className="font-bold">{existingParty?.name}</div>
              <div className="text-sm text-gray-600">
                {existingParty?.personalNumber || existingParty?.organizationNumber}
              </div>
            </div>
          )}

          <FormControl>
            <FormLabel>{mode === 'add' ? 'Välj roll' : 'Byt eller lägg till roll'}</FormLabel>
            <div className="flex flex-col gap-12">
              {availableRoles.map((role) => (
                <Checkbox
                  key={role}
                  data-cy={`party-modal-role-${role}`}
                  checked={selectedRoles.includes(role)}
                  onChange={() => handleRoleToggle(role)}
                >
                  {prettyContractRoles[role] || role}
                </Checkbox>
              ))}
            </div>
          </FormControl>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
        <Button
          color="vattjom"
          data-cy="party-modal-save-button"
          disabled={!selectedStakeholderId || selectedRoles.length === 0}
          onClick={handleSave}
        >
          Lägg till
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ContractPartyModal;
