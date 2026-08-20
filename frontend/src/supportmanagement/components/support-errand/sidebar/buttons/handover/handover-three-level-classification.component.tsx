'use client';

import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { ThreeLevelCategorization } from '@supportmanagement/components/support-errand-basics-form/ThreeLevelCategorization';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

/**
 * Renders the real three-level categorization component (verksamhet → ärendetyp → undertyp) so it
 * looks and behaves exactly like the registration view. It is wrapped in an isolated form so it sets
 * its labels there instead of mutating the source errand; the chosen labels are reported via onChange
 * and applied to the new (handed-over) errand.
 */
export const HandoverThreeLevelClassification: React.FC<{
  sourceErrand: SupportErrand;
  targetMetadata?: SupportMetadata;
  value: Label[];
  onChange: (labels: Label[]) => void;
}> = ({ sourceErrand, targetMetadata, value, onChange }) => {
  const methods = useForm<SupportErrand>({ defaultValues: { labels: value } as Partial<SupportErrand> });
  const labels = methods.watch('labels');

  useEffect(() => {
    onChange(labels ?? []);
  }, [labels, onChange]);

  // Synthetic errand seeded with the already-chosen labels (so the selection survives going back and
  // forth). Memoised on the source errand only – a stable reference avoids re-render loops with the
  // component's internal effects.
  const errand = useMemo(
    () => ({ ...sourceErrand, labels: value, category: '', type: '', subType: '' } as SupportErrand),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceErrand]
  );

  if (!targetMetadata) {
    return null;
  }

  return (
    <FormProvider {...methods}>
      {/* Same flex-row wrapper as the registration view so the two selects sit side by side. */}
      <div className="w-full flex gap-20">
        <ThreeLevelCategorization supportErrand={errand} supportMetadata={targetMetadata} />
      </div>
    </FormProvider>
  );
};
