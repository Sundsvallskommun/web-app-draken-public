import useDisplayPhasePoller from '@casedata/hooks/displayPhasePoller';
import { useSaveCasedataErrand } from '@casedata/hooks/useSaveCasedataErrand';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { validateAttachmentsForDecision } from '@casedata/services/casedata-attachment-service';
import {
  getErrand,
  isErrandLocked,
  validateAction,
  validateErrandForDecision,
  validateStakeholdersForDecision,
  validateStatusForDecision,
} from '@casedata/services/casedata-errand-service';
import { setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { Admin } from '@common/services/user-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormErrorMessage, Spinner, useSnackbar } from '@sk-web-gui/react';
import { IconName } from 'lucide-react/dynamic';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';
import { PhaseChangerDialogComponent } from './phasechanger-dialog.component';
import { phaseChangeInProgress, triggerErrandPhaseChange } from '@casedata/services/process-service';

export const PhaseChanger = () => {
  const {
    municipalityId,
    user,
    errand,
    setErrand,
    administrators,
    uiPhase,
  }: { municipalityId: string; user: any; errand: IErrand; setErrand: any; administrators: Admin[]; uiPhase: UiPhase } =
    useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const toastMessage = useSnackbar();
  const { pollDisplayPhase } = useDisplayPhasePoller();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  }: UseFormReturn<{ admin: string }, any, undefined> = useForm();

  const [phaseChangeText, setPhaseChangeText] = useState<{
    icon: IconName;
    button: string;
    title: string;
    message: JSX.Element;
    disabled?: boolean;
    disabledMessage?: string;
  }>({
    icon: 'lightbulb',
    button: 'Inled fasbyte',
    title: 'Vill du byta fas?',
    message: <p>Vill du byta fas?</p>,
  });
  useEffect(() => {
    if (uiPhase === UiPhase.registrerad) {
      setPhaseChangeText({
        icon: 'lightbulb',
        button: 'Gå ifrån registrerad',
        title: 'Vill du gå vidare?',
        message: <></>,
      });
    } else if (uiPhase === UiPhase.granskning) {
      setPhaseChangeText({
        icon: 'clipboard-list',
        button: 'Inled utredning',
        title: 'Inled utredning',
        message: <p>Är du säker på att du vill fortsätta?</p>,
      });
    } else if (uiPhase === UiPhase.utredning) {
      setPhaseChangeText({
        icon: 'scale',
        button: 'Redo för beslut',
        title: 'Redo för beslut',
        message: (
          <>
            <p>
              För att kunna fatta ett välgrundat beslut är det avgörande att du slutfört all nödvändig utredning och
              besitter all relevant information för ärendet.
            </p>
            <p className="my-md">Är du säker på att du vill fortsätta?</p>
          </>
        ),
        disabled: !validateErrandForDecision(errand),
        disabledMessage: !validateAttachmentsForDecision(errand).valid
          ? `Ärendet har felaktiga bilagor: ${validateAttachmentsForDecision(errand).reason}`
          : !validateStatusForDecision(errand).valid
          ? 'Ärendet har fel status för att beslut ska kunna fattas.'
          : !validateStakeholdersForDecision(errand).valid
          ? 'Ärendet saknar ärendeägare.'
          : undefined,
      });
    } else if (uiPhase === UiPhase.beslut) {
      setPhaseChangeText({ icon: 'lightbulb', button: 'N/A', title: 'N/A?', message: <></> });
    } else if (errand.phase === ErrandPhase.uppfoljning) {
      setPhaseChangeText({
        icon: 'folder-closed',
        button: 'Avsluta ärende',
        title: 'Avsluta ärendet?',
        message: (
          <p>
            Kontrollera att du dokumenterat samtliga handlingar och uppgifter innan ärendet stängs. Vill du stänga
            ärendet?
          </p>
        ),
      });
    } else {
      setPhaseChangeText({
        icon: 'circle',
        button: 'Inled fasbyte',
        title: 'Vill du byta fas?',
        message: <p>Vill du byta fas?</p>,
      });
    }
  }, [errand, uiPhase]);

  const showSaveError = () => {
    toastMessage({
      position: 'bottom',
      closeable: false,
      message: 'Något gick fel när handläggaren sparades',
      status: 'error',
    });
    setIsLoading(false);
  };

  const onSave = () => {
    setIsLoading(true);
    const admin = administrators.find((a) => a.adAccount === getValues().admin);
    if (!admin) {
      showSaveError();
      return;
    }
    return setAdministrator(municipalityId, errand, admin)
      .then(() => {
        toastMessage(
          getToastOptions({
            message: 'Handläggaren sparades, går vidare till granskning',
            status: 'success',
          })
        );
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        reset();
        pollDisplayPhase();
      })
      .catch(() => {
        showSaveError();
        return;
      });
  };

  const onError = () => {
    console.error('Something went wrong when saving');
  };

  const errandSave = useSaveCasedataErrand(false);

  const triggerPhaseChange = async () => {
    try {
      setPhaseDialogOpen(false);
      await errandSave();
      await triggerErrandPhaseChange(municipalityId, errand);
      const res = await getErrand(municipalityId, errand.id.toString());
      setErrand(res.errand);

      toastMessage(
        getToastOptions({
          message: 'Fasbytet inleddes',
          status: 'success',
        })
      );
    } catch (error) {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: 'Något gick fel när fasbytet inleddes',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return phaseChangeInProgress(errand) ? (
    <Button disabled variant="secondary" rightIcon={<Spinner size={2} />}>
      Fasbyte pågår
    </Button>
  ) : uiPhase === UiPhase.registrerad ? (
    <Button
      variant="primary"
      color="vattjom"
      onClick={async () => {
        setValue('admin', user.username);
        await errandSave();
        handleSubmit(onSave, onError)();
      }}
      rightIcon={<LucideIcon name="arrow-right" size={18} />}
    >
      Inled granskning
    </Button>
  ) : uiPhase === UiPhase.beslut ||
    errand.phase === ErrandPhase.verkstalla ||
    errand.status?.statusType === ErrandStatus.ArendeAvslutat ? null : (
    <>
      <Button
        variant="primary"
        disabled={isErrandLocked(errand) || !allowed || phaseChangeText.disabled}
        color="vattjom"
        loadingText="Sparar"
        loading={isLoading}
        onClick={() => {
          setPhaseDialogOpen(true);
        }}
        rightIcon={<LucideIcon name="arrow-right" size={18} />}
      >
        {phaseChangeText?.button}
      </Button>
      {phaseChangeText.disabledMessage ? (
        <FormErrorMessage data-cy="status-error-message" className="mt-md left-2 right-2 leading-16 text-error">
          {phaseChangeText.disabledMessage}
        </FormErrorMessage>
      ) : null}
      <PhaseChangerDialogComponent
        icon={phaseChangeText.icon}
        title={phaseChangeText.title}
        message={phaseChangeText.message}
        dialogIsOpen={phaseDialogOpen}
        setDialogIsOpen={setPhaseDialogOpen}
        triggerPhaseChange={triggerPhaseChange}
      />
    </>
  );
};
