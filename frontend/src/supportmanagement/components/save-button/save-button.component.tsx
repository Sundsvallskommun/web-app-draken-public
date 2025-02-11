import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import {
  getSupportErrandById,
  initiateSupportErrand,
  isSupportErrandLocked,
  SupportErrand,
  SupportErrandDto,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const SaveButtonComponent: React.FC<{
  supportErrand: SupportErrand;
  setSupportErrand: (e: SupportErrand) => void;
  verifyAndClose: () => void;
  registeringNewErrand?: boolean;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
  color?: string;
  label?: string;
  icon?: JSX.Element;
}> = (props) => {
  const {
    municipalityId,
  }: {
    administrators: Admin[];
    user: User;
    municipalityId: string;
  } = useAppContext();
  const [error, setError] = useState(false);
  const [isLoadingContinue, setIsLoadingContinue] = useState(false);
  const router = useRouter();
  const saveConfirm = useConfirm();
  const toastMessage = useSnackbar();
  const [confirmContent, setConfirmContent] = useState<{ title: string; content: string | JSX.Element }>({
    title: 'Spara ärendet',
    content: 'Vill du spara ärendet?',
  });

  const { supportErrand, setSupportErrand, verifyAndClose, setUnsaved, update } = props;

  const {
    handleSubmit,
    getValues,
    reset,
    formState,
  }: UseFormReturn<Partial<SupportErrand>, any, undefined> = useFormContext();

  useEffect(() => {
    const registeringNewErrand = typeof supportErrand?.id === 'undefined';
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
  }, [supportErrand]);

  const onError = (errors, e) => {
    console.error('Some error', errors);
  };

  const onSubmit = (close: boolean) => {
    const data: Partial<SupportErrand> = getValues();
    const dataToSave: Partial<SupportErrandDto> = {
      assignedUserId: data.assignedUserId,
      reporterUserId: data.reporterUserId,
      classification: {
        category: data.category,
        type: data.type,
      },
      businessRelated: data.businessRelated,
      description: data.description,
      contactReason: data.contactReason,
      contactReasonDescription: data.contactReasonDescription,
      channel: data.channel,
      stakeholders: data.stakeholders,
      priority: data.priority,
      status: data.status,
      title: data.title,
    };

    setError(false);
    let setIsLoading;
    setIsLoading = setIsLoadingContinue;
    setIsLoading(true);
    return initiateSupportErrand(municipalityId, dataToSave)
      .then(async (res) => {
        setIsLoading(false);
        setUnsaved(false);
        update();
        if (close) {
          verifyAndClose();
        }
        if (!res) {
          throw new Error('Errand could not be registered');
        }
        reset();
        await getSupportErrandById(res.id, municipalityId).then((e) => {
          setSupportErrand(e.errand);

          router.push(`/arende/${municipalityId}/${e.errand.id}`, `/arende/${municipalityId}/${e.errand.id}`, {
            shallow: true,
          });

          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Ärendet sparades',
            status: 'success',
          });
        });

        return true;
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
    <div className="w-full">
      <Button
        className="w-full"
        data-cy="save-and-continue-button"
        disabled={
          isSupportErrandLocked(supportErrand) ||
          (!formState.dirtyFields.category && !formState.dirtyFields.type) ||
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
  );
};
