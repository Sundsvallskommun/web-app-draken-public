import { AppealAttachmentsComponent } from '@casedata/components/errand/tabs/appeal/casedata-appeal-attachments.component';
import { Appeal, AppealStatusLabels, TimelinessReview, TimelinessReviewLabel } from '@casedata/interfaces/appeal';
import { DecisionOutcomeLabel } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { registerAppeal, updateAppeal } from '@casedata/services/casedata-appeal-service';
import { sendAttachments } from '@casedata/services/casedata-attachment-service';
import { getErrand, isErrandLocked, updateErrandStatus } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@contexts/app.context';
import CheckIcon from '@mui/icons-material/Check';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  DatePicker,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Modal,
  RadioButton,
  Select,
  Spinner,
  Textarea,
  useSnackbar,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import {
  FieldErrors,
  FormState,
  useFormContext,
  UseFormGetValues,
  UseFormHandleSubmit,
  UseFormRegister,
  UseFormReset,
  UseFormSetValue,
  UseFormTrigger,
  UseFormWatch,
} from 'react-hook-form';
import { CaseDataRegisterAppealFormModel } from './casedata-appeal-tab';

export const AppealFormModal: React.FC<{
  modalFetching?: boolean;
  isEdit: boolean;
  allowed: boolean;
  registerAppealIsOpen: boolean;
  closeHandler: () => void;
  fetchedAppeal: Appeal;
  register: UseFormRegister<CaseDataRegisterAppealFormModel>;
  setValue: UseFormSetValue<CaseDataRegisterAppealFormModel>;
  watch: UseFormWatch<CaseDataRegisterAppealFormModel>;
  handleSubmit: UseFormHandleSubmit<CaseDataRegisterAppealFormModel, undefined>;
  getValues: UseFormGetValues<CaseDataRegisterAppealFormModel>;
  errors: FieldErrors<CaseDataRegisterAppealFormModel>;
  reset: UseFormReset<CaseDataRegisterAppealFormModel>;
  setFetchedAppeal: Dispatch<SetStateAction<Appeal>>;
  trigger: UseFormTrigger<CaseDataRegisterAppealFormModel>;
  formState: FormState<CaseDataRegisterAppealFormModel>;
}> = (props) => {
  const {
    allowed,
    register,
    setValue,
    errors,
    reset,
    handleSubmit,
    fetchedAppeal,
    modalFetching,
    isEdit,
    registerAppealIsOpen,
    closeHandler,
    setFetchedAppeal,
    trigger,
    formState,
    watch,
  } = props;

  const { getValues } = useFormContext();
  const { description, registeredAt, appealConcernCommunicatedAt, decisionId, status, timelinessReview, decidedAt } =
    watch();
  const { municipalityId, errand, setErrand, user }: { municipalityId; errand: IErrand; setErrand; user } =
    useAppContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const toastMessage = useSnackbar();

  const onCloseHandler = () => {
    closeHandler();
    setFetchedAppeal(null);
    reset();
  };

  const onSubmit = async () => {
    const data = {
      description: description,
      registeredAt: registeredAt,
      appealConcernCommunicatedAt: appealConcernCommunicatedAt,
      decisionId: decisionId,
      status: status,
      timelinessReview: timelinessReview,
    };

    const apiCall = isEdit
      ? updateAppeal(municipalityId, errand.id, fetchedAppeal.id, data)
      : registerAppeal(municipalityId, errand.id?.toString(), data);
    setIsLoading(true);
    return apiCall
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: isEdit ? 'Överklagan sparades' : 'Överklagan registrerades',
          status: 'success',
        });
        setIsLoading(false);
        getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        setError(false);
        onCloseHandler();
        return true;
      })
      .then(() => {
        if (!isEdit) {
          updateErrandStatus(municipalityId, errand.id.toString(), ErrandStatus.BeslutOverklagat);
          getErrand(municipalityId, errand.id.toString()).then((res) => setErrand(res.errand));
        }
      })
      .then(() => {
        if (getValues('appealAttachments').length > 0) {
          const attachments = getValues('appealAttachments');

          const attachmentsData: { id?: string; type: string; file: FileList; attachmentName: string }[] =
            attachments.map((a) => ({
              id: a.newAttachmentFields[0].id,
              file: a.newAttachmentFields[0].file,
              type: a.attachmentType,
              attachmentName: a.newAttachmentFields[0].file[0].name,
            }));

          setIsLoading(true);
          const apiCall = sendAttachments(municipalityId, errand.errandNumber, attachmentsData);
          apiCall
            .then(() =>
              getErrand(municipalityId, errand.id.toString())
                .then((res) => setErrand(res.errand))
                .then(() => {
                  toastMessage({
                    position: 'bottom',
                    closeable: false,
                    message: attachments.length > 1 ? 'Bilagorna sparades' : 'Bilagan sparades',
                    status: 'success',
                  });
                  setIsLoading(false);
                })
            )
            .catch((e) => {
              if (e.message === 'MAX_SIZE') {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message: 'Filen överskrider maximal storlek (10 Mb)',
                  status: 'error',
                });
                setIsLoading(false);
              } else if (e.message === 'TYPE_MISSING') {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message: 'Typ måste anges för bilaga',
                  status: 'error',
                });
                setIsLoading(false);
              } else {
                toastMessage({
                  position: 'bottom',
                  closeable: false,
                  message: 'Något gick fel när bilagan sparades',
                  status: 'error',
                });
                setIsLoading(false);
              }
            });
        }
      })
      .catch((e) => {
        toastMessage({
          status: 'error',
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när överklagan skulle sparas',
        });
        console.error('Something went wrong when saving the appeal');
        setIsLoading(false);
        setError(true);
        onCloseHandler();
      });
  };

  useEffect(() => {
    if (errand.decisions) {
      const latest = errand.decisions
        ?.filter((d) => d.decisionType === 'FINAL')
        .sort((a, b) => (a.decidedAt > b.decidedAt ? -1 : 1))[0];
      setValue('decisionId', latest?.id);
      setValue('decidedAt', latest?.decidedAt);
    }
  }, [fetchedAppeal]);

  return (
    <Modal
      disableCloseOutside
      show={registerAppealIsOpen}
      className="max-w-[640px] w-full"
      onClose={() => {
        onCloseHandler();
      }}
      label={isEdit ? 'Överklagan' : 'Registrera Överklagan'}
    >
      <Modal.Content>
        {modalFetching ? (
          <Spinner size={24} />
        ) : (
          <>
            {isEdit ? (
              <div className="mb-lg flex flex-col">
                <div className="flex gap-12 w-full items-center mb-lg">
                  <div className="self-center bg-vattjom-surface-accent p-12 rounded">
                    <LucideIcon name="undo-2" className="block" size={24} />
                  </div>
                  <div className="w-full flex-1 items-center">
                    <div className="w-full flex justify-between items-center">
                      <span>
                        <strong>Överklagan</strong> (rättstidsprövning)
                      </span>
                    </div>
                    <span className="text-small">{`${dayjs(fetchedAppeal.appealConcernCommunicatedAt).format(
                      'YYYY-MM-DD'
                    )}`}</span>
                  </div>
                </div>
                <FormLabel>Beslut som överklagats</FormLabel>
                <span>
                  {errand.decisions.map((d) => {
                    if (d.id === fetchedAppeal.decisionId) {
                      const label = Object.entries(DecisionOutcomeLabel).find((x) => x[0] === d.decisionOutcome)[1];
                      const date = dayjs(d.decidedAt).format('YYYY-MM-DD');
                      return `${label} ${date}`;
                    }
                  })}
                </span>

                <FormLabel className="mt-lg">Rättstidsprövning</FormLabel>
                <span>
                  {fetchedAppeal.timelinessReview === TimelinessReview.APPROVED
                    ? 'Godkänn'
                    : Object.entries(TimelinessReviewLabel).find((d) => d[0] === fetchedAppeal.timelinessReview)?.[1]}
                </span>
              </div>
            ) : (
              <>
                <FormControl id="appeal-decision" className="w-full">
                  <FormLabel className="mt-lg">Beslut som överklagats</FormLabel>
                  <Select
                    {...register('decisionId')}
                    onChange={(e) => {
                      if (
                        !e.currentTarget.value ||
                        e.currentTarget.value === undefined ||
                        e.currentTarget.value === '-1'
                      ) {
                        setValue('decisionId', -1, { shouldDirty: true });
                        setValue('decidedAt', undefined, { shouldDirty: true });
                        trigger();
                      } else {
                        setValue('decisionId', Number(e.currentTarget.value), { shouldDirty: true });
                        const selectedDecision = errand.decisions.find((d) => d.id === Number(e.currentTarget.value));
                        if (selectedDecision) {
                          setValue('decidedAt', selectedDecision.decidedAt, { shouldDirty: true });
                        }
                        trigger();
                      }
                    }}
                    className="w-full"
                    data-cy="appealdecision-select"
                  >
                    <Select.Option value={-1}>Välj beslut</Select.Option>
                    {errand.decisions
                      ?.filter((d) => d.decisionType === 'FINAL')
                      .map((decision) => {
                        return (
                          <Select.Option key={`decision-${decision.id}`} value={decision.id}>
                            {Object.entries(DecisionOutcomeLabel).find((x) => x[0] === decision.decisionOutcome)[1]}{' '}
                            {dayjs(decision.decidedAt).format('YYYY-MM-DD')}
                          </Select.Option>
                        );
                      })}
                  </Select>
                </FormControl>
                {errors.decisionId && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{errors.decisionId.message}</FormErrorMessage>
                  </div>
                )}
                <div className="flex w-full gap-24 mt-24">
                  <div className="flex flex-col w-full gap-8">
                    <FormControl id="appeal-registeredAt" className="w-full">
                      <FormLabel>Beslut fattat</FormLabel>
                      <DatePicker
                        data-cy="registeredAt-datepicker"
                        value={decidedAt ? dayjs(decidedAt).format('YYYY-MM-DD') : ''}
                        disabled
                      />
                    </FormControl>
                    {errors.decidedAt && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{errors.decidedAt.message}</FormErrorMessage>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col w-full gap-8">
                    <FormControl id="appeal-appealConcernCommunicatedAt" className="w-full">
                      <FormLabel>Överklagan inkom</FormLabel>
                      <DatePicker
                        max={dayjs().format('YYYY-MM-DD')}
                        data-cy="appealConcernCommunicatedAt-datepicker"
                        value={dayjs(appealConcernCommunicatedAt).format('YYYY-MM-DD')}
                        onChange={(e) => {
                          if (e.currentTarget.value === undefined || !e.currentTarget.value) {
                            setValue('appealConcernCommunicatedAt', '');
                          } else {
                            setValue(
                              'appealConcernCommunicatedAt',
                              `${new Date(e.currentTarget.value)?.toISOString()}`,
                              { shouldDirty: true }
                            );
                          }
                          trigger();
                        }}
                      />

                      {errors.appealConcernCommunicatedAt && (
                        <div className="mt-sm text-error">
                          <FormErrorMessage>{errors.appealConcernCommunicatedAt?.message}</FormErrorMessage>
                        </div>
                      )}
                    </FormControl>
                  </div>
                </div>
                <div className={errors.appealConcernCommunicatedAt?.message ? 'mb-lg' : 'my-lg'}>
                  <FormControl id="appeal-trial" className="w-full">
                    <FormLabel className="mt-lg">Rättstidsprövning</FormLabel>
                    <RadioButton.Group className="mt-sm !flex-row" data-cy="appealtrial-radiogroup">
                      {Object.entries(TimelinessReviewLabel).map((tr) => {
                        return (
                          <RadioButton
                            onClick={(e) => setValue('timelinessReview', e.currentTarget.value, { shouldDirty: true })}
                            value={tr[0]}
                            {...register('timelinessReview')}
                            key={`tr-${tr[0]}`}
                            data-cy={`select-trial-${tr[0]}`}
                          >
                            {tr[1]}
                          </RadioButton>
                        );
                      })}
                    </RadioButton.Group>
                    {errors.timelinessReview && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{errors.timelinessReview?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>
                </div>
              </>
            )}
            <div>
              <FormControl id="appeal-status" className="w-full">
                <FormLabel>Status</FormLabel>

                <Input type="hidden" {...register('status')} />
                <Select
                  value={status}
                  onChange={(e) => setValue('status', e.currentTarget.value, { shouldDirty: true })}
                  className="w-full mb-lg mt-sm"
                  data-cy="appealstatus-select"
                  disabled={!isEdit}
                >
                  {Object.entries(AppealStatusLabels).map((status) => {
                    return (
                      <Select.Option key={`appealstatus-${status[0]}`} value={status[0]}>
                        {status[1]}
                      </Select.Option>
                    );
                  })}
                </Select>
              </FormControl>
              {errors.status && (
                <div className="my-sm text-error">
                  <FormErrorMessage>{errors.status?.message}</FormErrorMessage>
                </div>
              )}
            </div>
            <FormControl id="appeal-description" className="w-full">
              <FormLabel>Beskrivning</FormLabel>
              <Textarea
                className="w-full"
                rows={6}
                data-cy="appeal-description-input"
                onChange={(e) => setValue('description', e.currentTarget.value, { shouldDirty: true })}
                {...register('description')}
                value={description}
              />
            </FormControl>

            <div className="flex justify-start gap-md mt-8">
              <AppealAttachmentsComponent />
            </div>

            <div className="flex justify-start gap-md mt-16">
              <Button type="button" variant="secondary" onClick={onCloseHandler}>
                Avbryt
              </Button>
              <Button
                type="button"
                data-cy="save-appeal-button"
                disabled={!formState.isDirty || !formState.isValid || isErrandLocked(errand) || !allowed}
                onClick={handleSubmit(onSubmit)}
                leftIcon={
                  isLoading ? (
                    <Spinner color="tertiary" size={2} className="mr-sm" />
                  ) : (
                    <CheckIcon fontSize="large" className="mr-sm" />
                  )
                }
              >
                {isLoading ? 'Sparar' : 'Spara'}
              </Button>
              <div className="mt-lg">
                {error && <FormErrorMessage>Något gick fel när utredningen sparades.</FormErrorMessage>}
              </div>
            </div>
          </>
        )}
      </Modal.Content>
    </Modal>
  );
};
