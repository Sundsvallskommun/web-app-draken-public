import { Label } from '@sk-web-gui/react';

export const CaseStatusLabelComponent: React.FC<{ externalStatus: string }> = ({ externalStatus }) => {
  let color,
    inverted = true;
  switch (externalStatus) {
    case 'Inskickat':
      color = 'tertiary';
      break;
    case 'Handläggning pågår':
    case 'Kompletterad':
    case 'Kompletterat':
      color = 'info';
      break;
    case 'Komplettering behövs':
      color = 'warning';
      break;
    case 'Avslutat':
      color = 'gronsta';
      break;
    default:
      color = 'info';
      break;
  }

  return (
    <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto text-center whitespace-nowrap`}>
      {externalStatus}
    </Label>
  );
};
