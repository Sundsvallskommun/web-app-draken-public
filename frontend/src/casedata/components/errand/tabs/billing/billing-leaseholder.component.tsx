import { BillingRecipient } from '@casedata/interfaces/billing';
import { PrettyRole, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { useAppContext } from '@contexts/app.context';
import { FormControl, FormLabel, Select } from '@sk-web-gui/react';
import { FC, useState } from 'react';
interface BillingLeaseholderProps {
  onSelectRecipient: (recipient: BillingRecipient | undefined) => void;
}

export const BillingLeaseholder: FC<BillingLeaseholderProps> = ({ onSelectRecipient }) => {
  const { errand } = useAppContext();
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string>('');

  if (!errand) {
    return <span className="italic">Inga intressenter på ärendet</span>;
  }

  const stakeholders = (errand.stakeholders || []).filter((s) => !s.roles.includes(Role.ADMINISTRATOR));

  if (stakeholders.length === 0) {
    return <span className="italic">Inga intressenter på ärendet</span>;
  }

  const getDisplayName = (s: CasedataOwnerOrContact) => {
    const isOrganization = !!s.organizationNumber || !!s.organizationName;
    const name = isOrganization ? s.organizationName : `${s.firstName || ''} ${s.lastName || ''}`.trim();
    const roleKey = s.roles?.[1] || s.roles?.[0];
    const role = roleKey ? (PrettyRole as Record<string, string>)[roleKey] || roleKey : '';
    return role ? `${name} (${role})` : name;
  };

  const handleSelect = (stakeholderId: string) => {
    setSelectedStakeholderId(stakeholderId);
    if (!stakeholderId) {
      onSelectRecipient(undefined);
      return;
    }

    const stakeholder = stakeholders.find((s) => String(s.id) === String(stakeholderId));
    if (!stakeholder) return;

    const isOrganization = !!stakeholder.organizationNumber || !!stakeholder.organizationName;

    onSelectRecipient({
      name: isOrganization ? '' : `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`.trim(),
      organizationName: stakeholder.organizationName || '',
      personId: stakeholder.personId || '',
      organizationNumber: stakeholder.organizationNumber || '',
      address: stakeholder.street || '',
      postalCode: stakeholder.zip || '',
      city: stakeholder.city || '',
      role: stakeholder.roles?.[0] || '',
    });
  };

  return (
    <FormControl className="w-full max-w-[46rem]">
      <FormLabel>Fakturamottagare</FormLabel>
      <Select className="w-full" value={selectedStakeholderId} onChange={(e) => handleSelect(e.target.value)}>
        <Select.Option value="">Välj fakturamottagare</Select.Option>
        {stakeholders.map((s) => (
          <Select.Option key={s.id} value={String(s.id)}>
            {getDisplayName(s)}
          </Select.Option>
        ))}
      </Select>
    </FormControl>
  );
};
