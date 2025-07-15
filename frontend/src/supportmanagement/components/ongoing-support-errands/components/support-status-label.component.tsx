import { isROB } from '@common/services/application-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Label } from '@sk-web-gui/react';
import { Resolution, Status, StatusLabel, StatusLabelROB } from '@supportmanagement/services/support-errand-service';

export const SupportStatusLabelComponent: React.FC<{ status: string; resolution: string }> = ({
  status,
  resolution,
}) => {
  const solvedErrandIcon = () => {
    if (resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM) return 'split';
    else if (resolution === Resolution.CLOSED) return 'check';
    else if (resolution === Resolution.BACK_TO_MANAGER) return 'redo';
    else if (resolution === Resolution.BACK_TO_HR) return 'redo';
    else if (status === 'SOLVED') return 'check';
  };
  let color,
    inverted = false,
    icon = null;
  switch (status) {
    case 'SOLVED':
      color = 'primary';
      icon = solvedErrandIcon();
      break;
    case 'ONGOING':
      color = 'gronsta';
      icon = 'pen';
      break;
    case 'NEW':
      color = 'vattjom';
      break;
    case 'PENDING':
      color = 'gronsta';
      inverted = true;
      icon = 'clock-10';
      break;
    case 'AWAITING_INTERNAL_RESPONSE':
      color = 'gronsta';
      inverted = true;
      icon = 'clock-10';
      break;
    case 'SUSPENDED':
      color = 'warning';
      inverted = true;
      icon = 'circle-pause';
      break;
    case 'ASSIGNED':
      color = 'warning';
      inverted = false;
      icon = 'circle-pause';
      break;
    case 'UPSTART':
      color = 'tertiary';
      inverted = true;
      break;
    case 'PUBLISH_SELECTION':
      color = 'vattjom';
      inverted = true;
      break;
    case 'INTERNAL_CONTROL_AND_INTERVIEWS':
      color = 'tertiary';
      inverted = true;
      break;
    case 'REFERENCE_CHECK':
      color = 'juniskar';
      inverted = true;
      break;
    case 'REVIEW':
      color = 'warning';
      inverted = true;
      break;
    case 'SECURITY_CLEARENCE':
      color = 'bjornstigen';
      inverted = true;
      break;
    case 'FEEDBACK_CLOSURE':
      color = 'error';
      inverted = true;
      break;
    default:
      color = 'tertiary';
      break;
  }

  const solvedErrandText = () => {
    if (resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM && status === Status.SOLVED) return 'Eskalerat';
    else if (resolution === Resolution.CLOSED && status === Status.SOLVED) return 'Avslutat';
    else if (resolution === Resolution.BACK_TO_MANAGER && status === Status.SOLVED) return 'Åter till chef';
    else if (resolution === Resolution.BACK_TO_HR && status === Status.SOLVED) return 'Åter till HR';
    else return isROB() ? StatusLabelROB[status] : StatusLabel[status];
  };
  return (
    <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto text-center whitespace-nowrap`}>
      {icon ? <LucideIcon name={icon} size={16} /> : null} {solvedErrandText()}
    </Label>
  );
};
