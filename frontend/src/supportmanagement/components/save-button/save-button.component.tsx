import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked, saveErrand } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { deepFlattenToObject } from '@common/services/helper-service';
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
    administrators,
    user,
    municipalityId,
  }: {
    administrators: Admin[];
    user: User;
    municipalityId: string;
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

  const { supportErrand, setSupportErrand, verifyAndClose, setUnsaved, update, registeringNewErrand } = props;

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
  }: UseFormReturn<Partial<SupportErrand>, any, undefined> = useFormContext();

  const [doneSaving, setDoneSaving] = useState(false);
  // useEffect(() => {
  //   if (errand?.id && doneSaving) {
  //     router.push(`/arende/${municipalityId}/${errand.id}`, `/arende/${municipalityId}/${errand.id}`, {
  //       shallow: true,
  //     });
  //   }
  // }, [doneSaving, errand?.id, municipalityId, router]);

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

  useEffect(() => {
    if (supportErrand?.id && doneSaving) {
      router.push(`/arende/${municipalityId}/${supportErrand.id}`, `/arende/${municipalityId}/${supportErrand.id}`, {
        shallow: true,
      });
    }
  }, [supportErrand, doneSaving, municipalityId]);

  const onError = (errors, e) => {
    console.error('Some error', errors);
  };

  const onSubmit = (close: boolean) => {
    const data: Partial<SupportErrand> = getValues();
    const dataToSave: Partial<SupportErrandDto> = {
      classification: {
        category: data.category,
        type: data.type,
      },
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

        const e = await getSupportErrandById(res.id, municipalityId);
        setSupportErrand(e.errand);

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
        setDoneSaving(true);
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
      </div>
    </div>
  );
};
