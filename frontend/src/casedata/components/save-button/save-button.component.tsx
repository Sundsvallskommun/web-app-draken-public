import { IErrand } from '@casedata/interfaces/errand';
import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked, saveErrand } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { deepFlattenToObject } from '@common/services/helper-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { stakeholder2Contact } from '@casedata/services/casedata-stakeholder-service';
import { Role } from '@casedata/interfaces/role';

export const SaveButtonComponent: React.FC<{
  registeringNewErrand?: boolean;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  color?: string;
  label?: string;
  icon?: JSX.Element;
}> = (props) => {
  const {
    errand,
    administrators,
    user,
    municipalityId,
    setErrand,
  }: {
    errand: IErrand;
    administrators: Stakeholder[];
    user: User;
    municipalityId: string;
    setErrand: (e: IErrand) => void;
  } = useAppContext();
  const [error, setError] = useState(false);
  const [errandNumber, setErrandNumber] = useState<string | undefined>(errand?.errandNumber);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const router = useRouter();
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara ärendet',
    content: 'Vill du spara ärendet?',
  });

  const { registeringNewErrand } = props;

  const { handleSubmit, getValues, reset, formState }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  useEffect(() => {
    if (registeringNewErrand) {
      setConfirmContent({
        title: 'Registrera ärende',
        content: (
          <>
            När du registrerar ett ärende kommer det automatiskt att placeras under kategorin &quot;Inkomna
            ärenden&quot;. Därefter blir det tillgängligt för alla behöriga medarbetare inom din verksamhet.
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
  }, [errand]);

  const onError = (errors, e) => {
    console.error('Some error', errors);
  };

  const onSubmit = () => {
    const data: IErrand = getValues();
    if (formState.dirtyFields['administratorName']) {
      data.administrator = administrators.find((a) => `${a.firstName} ${a.lastName}` === data.administratorName);
    }

    if (data.administrator && data.administrator.adAccount) {
      const adAccount = data.administrator.adAccount.toLowerCase();

      data.stakeholders =
        data.stakeholders?.filter(
          (s) => !s.roles?.includes(Role.ADMINISTRATOR) && s.adAccount?.toLowerCase() !== adAccount
        ) || [];

      const mappedAdmin = {
        ...stakeholder2Contact(data.administrator),
        newRole: Role.ADMINISTRATOR,
      };

      data.stakeholders.push(mappedAdmin);
    }

    let dataToSave: Partial<IErrand> & { municipalityId: string };

    if (registeringNewErrand) {
      const { administrator, ...rest } = data;
      dataToSave = rest;
    } else {
      const dirtyData = {
        id: data.id,
        municipalityId: data.municipalityId,
        ...Object.entries(formState.dirtyFields).reduce((acc, [field, dirty]) => {
          if (dirty) acc[field] = data[field];
          return acc;
        }, {} as any),
      };

      delete dirtyData.administrator;

      dataToSave = dirtyData;
    }

    setError(false);
    let setIsLoading;
    setIsLoading = setIsLoadingContinue;
    setIsLoading(true);
    return saveErrand(dataToSave)
      .then(async (res) => {
        if (registeringNewErrand) {
          reset();
          setErrandNumber(res.errand?.errandNumber);
        } else {
          const saved = await getErrand(municipalityId, res.errandId);
          setErrand(saved.errand);
        }
        setIsLoading(false);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet sparades',
          status: 'success',
        });
      })
      .catch((e) => {
        console.error('Error when updating errand:', e);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när ärendet sparades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return true;
      });
  };

  useEffect(() => {
    setTimeout(() => {
      if (errandNumber && window.location.pathname.includes('registrera') && !formState.isDirty) {
        console.log('Redirecting to errand page after registration, formState.isDirty:', formState.isDirty);
        router.push(`/arende/${municipalityId}/${errandNumber}`);
      }
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState.isDirty, errandNumber]);

  return (
    <div>
      <div className="w-full flex gap-lg items-end">
        <div className="w-min">
          <Button
            data-cy="save-and-continue-button"
            disabled={
              isErrandLocked(errand) ||
              !Object.values(deepFlattenToObject(formState.dirtyFields)).some((v) => v) ||
              !formState.isValid
            }
            type="button"
            onClick={handleSubmit(() => {
              return saveConfirm
                .showConfirmation(confirmContent.title, confirmContent.content, 'Ja', 'Nej', 'info', 'info')
                .then((confirmed) => {
                  if (confirmed) {
                    onSubmit();
                  }
                  return confirmed ? () => true : () => {};
                });
            }, onError)}
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
            loading={isLoadingContinue}
            loadingText="Sparar"
          >
            {props.label || 'Spara'}
          </Button>
        </div>
      </div>
    </div>
  );
};
