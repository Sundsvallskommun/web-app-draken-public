import type { InvestigationAreaName } from '@supportmanagement/investigations';
import { getSupportActionErrandArea } from '@supportmanagement/services/support-action-errand-service';
import { useEffect, useRef } from 'react';

/**
 * The area of an action errand is named by the inspection it was raised from, since the errand itself carries no
 * mark of its trade. It is read once, when an investigation that has no area is opened, and written as the area
 * the handler would otherwise have had to pick without anything telling them which one is right. They can still
 * change it; a lookup that answers nothing leaves the choice empty.
 */
export const useNameTheAreaOfTheInspection = (
  theAreaCanBeNamed: boolean,
  inspectionErrandId: string | undefined,
  municipalityId: string,
  nameTheArea: (area: InvestigationAreaName) => Promise<void>
) => {
  const theInspectionWasAsked = useRef(false);

  useEffect(() => {
    if (!theAreaCanBeNamed || !inspectionErrandId || theInspectionWasAsked.current) return;
    theInspectionWasAsked.current = true;

    void getSupportActionErrandArea(municipalityId, inspectionErrandId)
      .catch(() => undefined)
      .then((area) => (area ? nameTheArea(area) : undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theAreaCanBeNamed, inspectionErrandId]);
};
