import { Priority as CasedataPriority } from '@casedata/interfaces/priority';
import { Priority as SupportPriority } from '@supportmanagement/interfaces/priority';
import { Badge } from '@sk-web-gui/react';

export const PriorityComponent: React.FC<{ priority?: string }> = ({ priority = '' }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case CasedataPriority.HIGH:
      case SupportPriority.HIGH:
        return 'error';
      case CasedataPriority.MEDIUM:
      case SupportPriority.MEDIUM:
        return 'warning';
      case CasedataPriority.LOW:
      case SupportPriority.LOW:
        return 'vattjom';
      default:
        return 'vattjom';
    }
  };

  if (!priority) {
    return null;
  }

  return (
    <>
      <Badge
        className="!max-w-[10px] !min-w-[10px] !max-h-[10px] !min-h-[10px] align-center"
        color={getPriorityColor(priority)}
        data-cy="errandPriority"
      />
      {priority}
    </>
  );
};
