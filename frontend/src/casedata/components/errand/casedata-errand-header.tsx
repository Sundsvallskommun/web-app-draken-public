import { CaseLabels } from '@casedata/interfaces/case-label';
import { useCasedataStore } from '@stores/index';

export const CasedataErrandHeader: React.FC = () => {
  const errand = useCasedataStore((s) => s.errand);

  if (!errand?.id) return null;

  return (
    <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-24 pt-8 w-full">
      <h1 className="max-md:w-full text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
        {CaseLabels.ALL[errand.caseType as keyof typeof CaseLabels.ALL] ?? ''}
      </h1>
    </div>
  );
};
