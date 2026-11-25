import { Investigation, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { SnackbarProps } from '@sk-web-gui/react';
import { InvestigationAreaName } from '@supportmanagement/investigations';
import { sectionKeyOf } from '@supportmanagement/services/support-investigation-sections';
import { useEffect, useRef } from 'react';

export const useFillTheLegalBasis = (
  legalBasisCanBeWritten: boolean,
  investigation: Investigation | undefined,
  area: InvestigationAreaName | undefined,
  fillTheLegalBasis: (section: InvestigationSection) => Promise<boolean>,
  reportTheLegalBasisWasNotWritten: () => SnackbarProps | undefined
) => {
  const legalBasisWrittenForArea = useRef<string | null>(null);

  useEffect(() => {
    if (!legalBasisCanBeWritten || !investigation) return;

    const writtenForArea = legalBasisWrittenForArea.current;
    const areaToWriteFor = area ?? '';
    if (writtenForArea === areaToWriteFor) return;

    const section = (investigation.sections ?? []).find((candidate) => sectionKeyOf(candidate) === 'legal_basis');
    if (!section) return;

    const theAreaWasChanged = writtenForArea !== null;
    legalBasisWrittenForArea.current = areaToWriteFor;
    if (!theAreaWasChanged && (section.text ?? '').trim()) return;

    // A write that does not go through leaves the area unmarked, so that it is tried again and the handler is not
    // left with the legal basis of the area they just changed away from without being told.
    void fillTheLegalBasis(section).then((written) => {
      if (written) return;
      legalBasisWrittenForArea.current = writtenForArea;
      if (theAreaWasChanged) reportTheLegalBasisWasNotWritten();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legalBasisCanBeWritten, investigation, area]);
};
