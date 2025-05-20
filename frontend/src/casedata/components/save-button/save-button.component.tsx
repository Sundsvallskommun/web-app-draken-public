import { IErrand } from '@casedata/interfaces/errand';
import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked, saveErrand } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { deepFlattenToObject } from '@common/services/helper-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';
import { stakeholder2Contact } from '@casedata/services/casedata-stakeholder-service';
import { Role } from '@casedata/interfaces/role';

export const SaveButtonComponent: React.FC<{
  errand: IErrand;
  verifyAndClose: () => void;
  registeringNewErrand?: boolean;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  color?: string;
  label?: string;
  icon?: JSX.Element;
}> = (props) => {
  const {
    administrators,
    user,
    municipalityId,
    setErrand,
  }: {
    administrators: Stakeholder[];
    user: User;
    municipalityId: string;
    setErrand: (e: IErrand) => void;
  } = useAppContext();
  const [richText, setRichText] = useState<string>('');
  const [modalAction, setModalAction] = useState<() => Promise<any>>();
  const [error, setError] = useState(false);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const router = useRouter();
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara ärendet',
    content: 'Vill du spara ärendet?',
  });

  const { errand, verifyAndClose, setUnsaved, update, registeringNewErrand } = props;

  const {
    handleSubmit,
    register,
    control,
    watch,
    setValue,
    getValues,
    trigger,
    reset,
    formState,
    formState: { errors },
  }: UseFormReturn<IErrand, any, undefined> = useFormContext();

  const [doneSaving, setDoneSaving] = useState(false);
  useEffect(() => {
    if (errand?.id && doneSaving) {
      router.push(
        `/arende/${municipalityId}/${errand.errandNumber}`,
        `/arende/${municipalityId}/${errand.errandNumber}`,
        { shallow: true }
      );
    }
  }, [doneSaving, errand?.id, errand?.errandNumber, municipalityId, router]);

  useEffect(() => {
    const registeringNewErrand = typeof errand?.id === 'undefined';
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

  const onSubmit = (close: boolean) => {
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
        setIsLoading(false);
        setUnsaved(false);
        update();
        if (close) {
          verifyAndClose();
        }
        if (!res.errandSuccessful) {
          throw new Error('Errand could not be registered');
        }

        const e = await getErrand(municipalityId, res.errandId);
        setErrand(e.errand);

        if (registeringNewErrand) {
          setUnsaved(false);
          setTimeout(() => {
            reset(e.errand);
          }, 0);
        }
        setTimeout(() => {
          reset(e.errand);
        }, 0);
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Ärendet sparades',
          status: 'success',
        });
        return true;
      })
      .then(() => {
        if (registeringNewErrand) {
          setDoneSaving(true);
        }
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

  const onSubmitAndContinue = () => onSubmit(false);

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
                    onSubmitAndContinue();
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
