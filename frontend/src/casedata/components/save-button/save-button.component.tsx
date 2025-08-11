import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { deepFlattenToObject } from '@common/services/helper-service';
import { Admin } from '@common/services/user-service';
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
  const [errandNumber, setErrandNumber] = useState<string | undefined>(errand?.errandNumber);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const router = useRouter();
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara ärendet',
    content: 'Vill du spara ärendet?',
  });

  const { registeringNewErrand } = props;
  const { handleSubmit, formState }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (registeringNewErrand) {
      setConfirmContent({
        title: 'Registrera ärende',
        content: (
          <>
            När du registrerar ett ärende kommer det automatiskt att placeras under kategorin &quot;Nya ärenden&quot;.
            Därefter blir det tillgängligt för alla behöriga medarbetare inom din verksamhet.
            <br />
            <br />
            Vill du fortsätta med registreringen?
          </>
        ),
      });
    } else {
      setConfirmContent({
        title: 'Spara ärendet',
        content: 'Vill du spara ärendet?',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  useEffect(() => {
    setTimeout(() => {
      if (errandNumber && window.location.pathname.includes('registrera') && !formState.isDirty) {
        console.log('Redirecting to errand page after registration, formState.isDirty:', formState.isDirty);
        router.push(`/arende/${municipalityId}/${errandNumber}`);
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
        onClick={handleSubmit(() => {
          saveErrand();
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
        loading={isLoadingContinue || props.loading}
        loadingText="Sparar"
      >
        {props.label || 'Spara'}
      </Button>
    </div>
  );
};
