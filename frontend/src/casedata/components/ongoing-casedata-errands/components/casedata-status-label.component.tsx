import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Label } from '@sk-web-gui/react';
import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';

export const CasedataStatusLabelComponent: React.FC<{ status: string }> = ({ status }) => {
  let color,
    inverted = false,
    icon = null;
  switch (status) {
    case ErrandStatus.ArendeAvslutat:
      color = 'primary';
      icon = 'check';
      break;
    case ErrandStatus.BeslutOverklagat:
    case ErrandStatus.BeslutVerkstallt:
    case ErrandStatus.Beslutad:
    case ErrandStatus.UnderGranskning:
    case ErrandStatus.UnderUtredning:
    case ErrandStatus.UnderBeslut:
      color = 'gronsta';
      icon = 'pen';
      break;
    case ErrandStatus.ArendeInkommit:
      color = 'vattjom';
      break;
    case ErrandStatus.VantarPaKomplettering:
      color = 'gronsta';
      inverted = true;
      icon = 'clock-10';
      break;
    case ErrandStatus.InterntAterkoppling:
      color = 'gronsta';
      inverted = true;
      icon = 'clock-10';
      break;
    case ErrandStatus.Parkerad:
      color = 'warning';
      inverted = true;
      icon = 'circle-pause';
      break;
    case ErrandStatus.Tilldelat:
      color = 'warning';
      inverted = false;
      icon = 'circle-pause';
      break;
    case 'Inskickat':
      color = 'vattjom';
      break;
    case 'Under behandling':
      color = 'gronsta';
      break;
    default:
      color = 'tertiary';
      break;
  }

  return (
    <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto text-center whitespace-nowrap`}>
      {icon ? (() => { const DynIcon = iconMap[icon]; return DynIcon ? <DynIcon size={16} /> : null; })() : null} {status}
    </Label>
  );
};
