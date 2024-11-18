import { ErrandStatus } from '@casedata/interfaces/errand-status';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Label } from '@sk-web-gui/react';

export const CasedataStatusLabelComponent: React.FC<{ status: string }> = ({ status }) => {
  console.log('status:', status);
  let color,
    inverted = false,
    icon = null;
  switch (status) {
    case ErrandStatus.ArendeAvslutat:
      color = 'primary';
      icon = 'check';
      break;
    case ErrandStatus.AterkopplingRemiss:
    case ErrandStatus.BeslutOverklagat:
    case ErrandStatus.BeslutVerkstallt:
    case ErrandStatus.Beslutad:

    case ErrandStatus.KompletteringInkommen:
    case ErrandStatus.UnderGranskning:
    case ErrandStatus.UnderUtredning:
    case ErrandStatus.UnderBeslut:
    case ErrandStatus.UnderRemiss:
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
    case ErrandStatus.InterntKomplettering:
    case ErrandStatus.InterntAterkoppling:
      color = 'gronsta';
      inverted = true;
      icon = 'clock-10';
      break;
    //  Lines below to be used for suspended errands shortly
    // case ErrandStatus.Parkerat:
    //   color = 'warning';
    //   inverted = true;
    //   icon = 'circle-pause';
    //   break;
    case ErrandStatus.Tilldelat:
      color = 'warning';
      inverted = false;
      icon = 'circle-pause';
      break;
    default:
      color = 'tertiary';
      break;
  }

  return (
    <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto text-center whitespace-nowrap`}>
      {icon ? <LucideIcon name={icon} size={16} /> : null} {status}
    </Label>
  );
};
