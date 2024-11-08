import useDisplayPhasePoller from '@casedata/hooks/displayPhasePoller';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase, UiPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { validateAttachmentsForDecision } from '@casedata/services/casedata-attachment-service';
import {
  getErrand,
  isErrandLocked,
  phaseChangeInProgress,
  triggerErrandPhaseChange,
  validateAction,
  validateErrandForDecision,
  validateStatusForDecision,
} from '@casedata/services/casedata-errand-service';
import { setAdministrator } from '@casedata/services/casedata-stakeholder-service';
import { useAppContext } from '@common/contexts/app.context';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormControl, FormLabel, Modal, Select, Spinner, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { UseFormReturn, useForm } from 'react-hook-form';

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
  const phaseConfirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectingAdmin, setSelectingAdmin] = useState(false);
  const toastMessage = useSnackbar();
  const { pollDisplayPhase } = useDisplayPhasePoller();
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    getValues,
    formState,
    formState: { errors },
  }: UseFormReturn<{ admin: string }, any, undefined> = useForm();

  const [phaseChangeText, setPhaseChangeText] = useState<{
    button: string;
    title: string;
    message: string | JSX.Element;
    disabled?: boolean;
    disabledMessage?: string;
  }>({
    button: 'Inled fasbyte',
    title: 'Vill du byta fas?',
    message: 'Vill du byta fas?',
  });
  useEffect(() => {
    if (uiPhase === UiPhase.granskning) {
      setPhaseChangeText({
        button: 'Inled utredning',
        title: 'Inled utredning',
        message: (
          <>
            <p className="my-md">Är du säker på att du vill fortsätta?</p>
          </>
        ),
      });
    } else if (uiPhase === UiPhase.registrerad) {
      setPhaseChangeText({ button: 'Gå ifrån registrerad', title: 'Vill du gå vidare?', message: '' });
    } else if (uiPhase === UiPhase.utredning) {
      setPhaseChangeText({
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
          : null,
      });
    } else if (uiPhase === UiPhase.beslut) {
      setPhaseChangeText({ button: 'N/A', title: 'N/A?', message: '' });
    } else if (uiPhase === UiPhase.slutfor && errand.phase === ErrandPhase.uppfoljning) {
      setPhaseChangeText({ button: 'Avsluta ärende', title: 'Vill du avsluta ärendet?', message: '' });
    } else {
      setPhaseChangeText({
        button: 'Inled fasbyte',
        title: 'Vill du byta fas?',
        message: 'Vill du byta fas?',
      });
    }
  }, [errand, uiPhase]);

  const { admin } = watch();

  const onSave = () => {
    const admin = administrators.find((a) => a.displayName === getValues().admin);
    setIsLoading(true);
    setError(false);
    return setAdministrator(municipalityId, errand, admin)
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Handläggaren sparades, går vidare till granskning',
          status: 'success',
        });
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        reset();
        setSelectingAdmin(false);
        pollDisplayPhase();
      })
      .catch((e) => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när handläggaren sparades',
          status: 'error',
        });
        setError(true);
        setIsLoading(false);
        return;
      });
  };

  const onError = () => {
    console.error('Something went wrong when saving');
  };

  const triggerPhaseChange = () => {
    phaseConfirm
      .showConfirmation(phaseChangeText.title, phaseChangeText.message, 'Ja', 'Nej', 'info', 'info')
      .then((confirmed) => {
        if (confirmed) {
          return triggerErrandPhaseChange(municipalityId, errand)
            .then(() => getErrand(municipalityId, errand.id.toString()))
            .then((res) => setErrand(res.errand))
            .then(() => {
              setIsLoading(false);
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Fasbytet inleddes',
                status: 'success',
              });
              setError(true);
              setIsLoading(false);
            })
            .catch(() => {
              toastMessage({
                position: 'bottom',
                closeable: false,
                message: 'Något gick fel när fasbytet inleddes',
                status: 'error',
              });
              setError(true);
              setIsLoading(false);
            });
        }
      });
  };

  return phaseChangeInProgress(errand) ? (
    <Button disabled variant="secondary" rightIcon={<Spinner size={2} />}>
      Fasbyte pågår
    </Button>
  ) : uiPhase === UiPhase.registrerad ? (
    <>
      <Button
        variant="primary"
        color="vattjom"
        onClick={() => {
          setSelectingAdmin(true);
        }}
        rightIcon={<LucideIcon name="arrow-right" size={18} />}
      >
        Tilldela handläggare
      </Button>
      <Modal
        show={selectingAdmin}
        className="w-[43rem]"
        onClose={() => {
          setSelectingAdmin(false);
          setValue('admin', 'Välj handläggare');
        }}
        label={'Tilldela handläggare'}
      >
        <Modal.Content>
          <p>
            För att inleda utredning behöver ärendet tilldelas en ansvarig handläggare. Du kan utse dig själv eller
            någon annan i ditt team.
          </p>
          <FormControl id="administrator" className="w-full" required>
            <FormLabel>Ansvarig handläggare</FormLabel>
            <Select
              className="w-full"
              size="sm"
              data-cy="admin-input"
              placeholder="Välj handläggare"
              aria-label="Välj handläggare"
              {...register('admin')}
              value={admin}
            >
              {!errand?.administrator?.adAccount ? <Select.Option>Välj handläggare</Select.Option> : null}
              {administrators.map((a) => (
                <Select.Option key={a.adAccount}>{a.displayName}</Select.Option>
              ))}
            </Select>
          </FormControl>
        </Modal.Content>
        <Modal.Footer>
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              setSelectingAdmin(false);
              setValue('admin', 'Välj handläggare');
            }}
          >
            Avbryt
          </Button>
          {errand?.id && formState.dirtyFields.admin && admin !== 'Välj handläggare' ? (
            <Button
              variant="primary"
              disabled={!errand?.id || !formState.dirtyFields.admin || admin === 'Välj handläggare'}
              loadingText="Sparar"
              loading={isLoading}
              size="sm"
              onClick={handleSubmit(onSave, onError)}
            >
              Tilldela
            </Button>
          ) : null}
        </Modal.Footer>
      </Modal>
    </>
  ) : uiPhase === UiPhase.beslut || errand.status === ErrandStatus.ArendeAvslutat ? null : (
    <Button
      variant="primary"
      disabled={
        isErrandLocked(errand) || !allowed || (uiPhase === UiPhase.utredning && !validateErrandForDecision(errand))
      }
      color="vattjom"
      loadingText="Sparar"
      loading={isLoading}
      onClick={triggerPhaseChange}
      rightIcon={<LucideIcon name="arrow-right" size={18} />}
    >
      {phaseChangeText?.button}
    </Button>
  );
};
