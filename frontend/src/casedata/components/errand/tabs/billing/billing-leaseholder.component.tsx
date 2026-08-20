import { BillingFormData, BillingRecipient } from '@casedata/interfaces/billing';
import { PrettyRole, Role } from '@casedata/interfaces/role';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { FormControl, FormErrorMessage, FormLabel, Select } from '@sk-web-gui/react';
import { useCasedataStore } from '@stores/index';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
interface BillingLeaseholderProps {
  onSelectRecipient: (recipient: BillingRecipient | undefined) => void;
}

export const BillingLeaseholder: React.FC<BillingLeaseholderProps> = ({ onSelectRecipient }) => {
  const errand = useCasedataStore((s) => s.errand);
  const {
    formState: { errors },
    setValue,
  } = useFormContext<BillingFormData>();
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<string>('');
  const recipient = useWatch<BillingFormData>({ name: 'recipient' });

  useEffect(() => {
    if (!recipient) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedStakeholderId('');
    }
  }, [recipient]);

  const stakeholders = (errand?.stakeholders || []).filter((s) => !s.roles.includes(Role.ADMINISTRATOR));

  if (stakeholders.length === 0) {
    return <span className="text-secondary">Inga intressenter på ärendet</span>;
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
    const customerRef = isOrganization
      ? stakeholder.organizationName || ''
      : `${stakeholder.firstName || ''} ${stakeholder.lastName || ''}`.trim();
    setValue('specifications.customerReference', customerRef);

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
    <FormControl className="w-full max-w-[46rem]" invalid={!!errors.recipient}>
      <FormLabel>Fakturamottagare *</FormLabel>
      <Select className="w-full" value={selectedStakeholderId} onChange={(e) => handleSelect(e.target.value)}>
        <Select.Option value="">Välj fakturamottagare</Select.Option>
        {stakeholders.map((s) => (
          <Select.Option key={s.id} value={String(s.id)}>
            {getDisplayName(s)}
          </Select.Option>
        ))}
      </Select>
      <small>Fakturamottagare hämtas från de parter som lagts till under Grunduppgifter.</small>
      {errors.recipient && (
        <FormErrorMessage>{errors.recipient.message || 'Välj en fakturamottagare'}</FormErrorMessage>
      )}
    </FormControl>
  );
};
