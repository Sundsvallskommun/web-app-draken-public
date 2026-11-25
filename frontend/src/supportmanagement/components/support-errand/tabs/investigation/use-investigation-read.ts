import { Investigation } from '@common/data-contracts/supportmanagement/data-contracts';
import { getSupportInvestigation } from '@supportmanagement/services/support-investigation-service';
import { SetStateAction, useEffect } from 'react';

export const useGetSupportInvestigation = (
  errandId: string | undefined,
  municipalityId: string,
  receiveKeepingUnsavedEdits: (result: Investigation | undefined) => void,
  setIsLoading: (value: SetStateAction<boolean>) => void,
  setError: (value: SetStateAction<boolean>) => void,
  modified: string | undefined
) => {
  useEffect(() => {
    if (!errandId) return undefined;
    let current = true;
    getSupportInvestigation(errandId, municipalityId)
      .then((result) => {
        if (!current) return;
        receiveKeepingUnsavedEdits(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (!current) return;
        setError(true);
        setIsLoading(false);
      });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errandId, municipalityId, modified, receiveKeepingUnsavedEdits]);
};
