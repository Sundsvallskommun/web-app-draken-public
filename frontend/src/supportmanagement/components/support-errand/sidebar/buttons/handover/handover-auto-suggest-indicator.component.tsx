import { MatchReason } from '@common/data-contracts/supportmanagement/data-contracts';
import { Icon } from '@sk-web-gui/react';
import { Sparkles } from 'lucide-react';

const matchReasonText = (matchReason?: MatchReason): string => {
  switch (matchReason) {
    case MatchReason.NAME_EXACT:
      return 'Baserat på exakt matchning av tekniskt namn';
    case MatchReason.DISPLAY_NAME_EXACT:
      return 'Baserat på displayName-matchning';
    case MatchReason.RESOURCE_PATH_MATCH:
      return 'Baserat på matchning av resurssökväg';
    default:
      return 'Automatiskt förslag från systemet';
  }
};

/**
 * Small marker shown next to a mapping dropdown when the preselected value is an auto-suggestion
 * from the backend, so the user understands the value was guessed (and on what basis).
 */
export const HandoverAutoSuggestIndicator: React.FC<{ matchReason?: MatchReason }> = ({ matchReason }) => {
  return (
    <span
      className="inline-flex items-center gap-4 text-small text-vattjom-text-primary"
      title={matchReasonText(matchReason)}
    >
      <Icon icon={<Sparkles />} size={16} aria-hidden />
      Auto-förslag
    </span>
  );
};
