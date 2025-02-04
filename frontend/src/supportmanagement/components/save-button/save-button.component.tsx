import { Stakeholder } from '@casedata/interfaces/stakeholder';
import { getErrand, isErrandLocked, saveErrand } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { deepFlattenToObject } from '@common/services/helper-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import {
  getSupportErrandById,
  initiateSupportErrand,
  isSupportErrandLocked,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFormContext, UseFormReturn } from 'react-hook-form';

export const SaveButtonComponent: React.FC<{
  errand: SupportErrand;
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
    setSupportErrand,
  }: {
    administrators: Stakeholder[];
    user: User;
    municipalityId: string;
    setSupportErrand: (e: SupportErrand) => void;
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
  }: UseFormReturn<SupportErrand, any, undefined> = useFormContext();

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
    const data: SupportErrand = getValues();
    const dataToSave: Partial<SupportErrand> = {
      reporterUserId: data.assignedUserId,
      assignedUserId: data.assignedUserId,
      classification: {
        category: data.category,
        type: data.type,
      },
      priority: data.priority,
      status: data.status,
      resolution: data.resolution,
      title: '',
    };
    // if (formState.dirtyFields['administratorName']) {
    //   data.administrator = administrators.find((a) => `${a.firstName} ${a.lastName}` === data.administratorName);
    // }
    // let dataToSave: Partial<SupportErrand> & { municipalityId: string };
    // if (registeringNewErrand) {
    //   dataToSave = data;
    // } else {
    //   let dirtyData = {
    //     id: data.id,
    //     municipalityId: data.municipalityId,
    //     ...(data.administrator && { administrator: data.administrator }),
    //   };
    //   Object.entries(formState.dirtyFields).forEach(([field, dirty]) => {
    //     if (dirty) {
    //       dirtyData[field] = data[field];
    //     }
    //   });

    //   dataToSave = dirtyData;
    // }

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
        if (!res.errandSuccessful) {
          throw new Error('Errand could not be registered');
        }

        const e = await getSupportErrandById(municipalityId, res.errandId);
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

  console.log(getValues());

  return (
    <div>
      <div className="w-full flex gap-lg items-end">
        <div className="w-min">
          <Button
            data-cy="save-and-continue-button"
            disabled={
              isSupportErrandLocked(errand) ||
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
