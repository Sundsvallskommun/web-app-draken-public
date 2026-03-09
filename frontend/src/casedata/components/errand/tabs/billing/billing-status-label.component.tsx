import LucideIcon from '@sk-web-gui/lucide-icon';
import { Label } from '@sk-web-gui/react';
import { billingrecordStatusToLabel } from '@supportmanagement/services/support-billing-service';

//TODO: Update colors?

export const BillingStatusLabel: React.FC<{ status: string }> = ({ status }) => {
  let color,
    inverted = false,
    icon = null;
  switch (status) {
    case 'NEW':
      color = 'vattjom';
      inverted = true;
      break;
    case 'APPROVED':
      color = 'gronsta';
      break;
    case 'REJECTED':
      color = 'primary';
      break;
    case 'INVOICED':
      color = 'juniskar';
      break;
    default:
      color = 'tertiary';
      break;
  }

  return (
    <Label
      rounded
      inverted={inverted}
      color={color}
      className={`max-h-full h-auto text-center whitespace-nowrap w-fit`}
    >
      {icon ? <LucideIcon name={icon} size={16} /> : null} {billingrecordStatusToLabel(status)}
    </Label>
  );
};
