import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { deepFlattenToObject } from '@common/services/helper-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const SaveButtonComponent: React.FC<{
  registeringNewErrand?: boolean;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  color?: string;
  label?: string;
  icon?: JSX.Element;
  loading?: boolean;
}> = (props) => {
  const {
    errand,
    municipalityId,
  }: {
    errand: IErrand;
    municipalityId: string;
  } = useAppContext();
  const errandNumber = errand?.errandNumber;
  const router = useRouter();
  const [internalLoading, setInternalLoading] = useState(false);

  const { registeringNewErrand } = props;
  const { handleSubmit, formState }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    setTimeout(() => {
      if (errandNumber && window.location.pathname.includes('registrera') && !formState.isDirty) {
        router.push(`/arende/${errandNumber}`);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.isDirty, errandNumber]);

  const saveErrand = useSaveCasedataErrand(registeringNewErrand);

  return (
    <div className="w-full flex gap-lg items-end">
      <Button
        className={registeringNewErrand ? 'w-min' : 'w-full mt-8'}
        data-cy="save-and-continue-button"
        disabled={
          isErrandLocked(errand) ||
          !Object.values(deepFlattenToObject(formState.dirtyFields)).some((v) => v) ||
          !formState.isValid ||
          errand.status?.statusType === ErrandStatus.Parkerad
        }
        type="button"
        onClick={handleSubmit(async () => {
          setInternalLoading(true);
          await saveErrand();
          setInternalLoading(false);
        })}
        color={
          (props.color as
            | 'info'
            | 'success'
            | 'primary'
            | 'warning'
            | 'error'
            | 'vattjom'
            | 'gronsta'
            | 'bjornstigen'
            | 'juniskar') || 'primary'
        }
        rightIcon={props.icon ? <LucideIcon name="arrow-right" size={18} /> : null}
        loading={props.loading || internalLoading}
        loadingText="Sparar"
      >
        {props.label || 'Spara'}
      </Button>
    </div>
  );
};
