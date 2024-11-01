import { Appeal, AppealStatus, TimelinessReview } from '@casedata/interfaces/appeal';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { fetchAppeal } from '@casedata/services/casedata-appeal-service';
import { isErrandLocked, validateAction } from '@casedata/services/casedata-errand-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Fragment, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { AppealFormModal } from './casedata-appeal-form-modal.component';

export interface CaseDataRegisterAppealFormModel {
  description?: string;
  registeredAt: string;
  decidedAt: string;
  appealConcernCommunicatedAt: string;
  timelinessReview?: string;
  status: string;
  decisionId?: number;
}

const defaultAppealInformation: CaseDataRegisterAppealFormModel = {
  description: '',
  registeredAt: `${new Date().toISOString()}`,
  decidedAt: '',
  appealConcernCommunicatedAt: '',
  timelinessReview: TimelinessReview.APPROVED,
  status: AppealStatus.NEW,
  decisionId: undefined,
};

export const CasedataAppealTab: React.FC<{}> = () => {
  const { municipalityId, errand, user } = useAppContext();
  const [registerAppealIsOpen, setRegisterAppealIsOpen] = useState<boolean>(false);
  const [allowed, setAllowed] = useState(false);
  const [modalFetching, setModalFetching] = useState(false);
  const [fetchedAppeal, setFetchedAppeal] = useState<Appeal>();

  let formSchema = yup
    .object({
      appealConcernCommunicatedAt: yup
        .date()
        .typeError('Datum för när överklagan inkom måste anges')
        .required('Datum för när överklagan inkom måste anges')
        .max(new Date(), 'Ange ett giltigt datum'),
      decisionId: yup.number().test('empty-check', 'Beslut måste anges', (id) => id !== -1),
      timelinessReview: yup.mixed<TimelinessReview>().required('Rättstidsprövning måste anges'),
      status: yup.string().required('Status måste anges'),
    })
    .required();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState,
    getValues,
    trigger,
    reset,
    formState: { errors, isDirty },
  } = useForm<CaseDataRegisterAppealFormModel>({
    resolver: yupResolver(formSchema),
    defaultValues: defaultAppealInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  useEffect(() => {
    const _a = validateAction(errand, user) && !!errand.administrator;
    setAllowed(_a);
  }, [user, errand]);

  const openRegisterAppealHandler = () => {
    setRegisterAppealIsOpen(true);
  };

  const onCloseRegisterAppealHandler = () => {
    setRegisterAppealIsOpen(false);
    setFetchedAppeal(null);
  };

  useEffect(() => {
    if (!modalFetching) {
      if (fetchedAppeal) {
        setValue('description', fetchedAppeal.description);
        setValue('registeredAt', fetchedAppeal.registeredAt);
        setValue('appealConcernCommunicatedAt', fetchedAppeal.appealConcernCommunicatedAt);
        setValue('decisionId', fetchedAppeal.decisionId);
        setValue('status', fetchedAppeal.status);
        setValue('timelinessReview', fetchedAppeal.timelinessReview);
      }
    }
    setModalFetching(false);
  }, [fetchedAppeal]);

  return (
    <>
      <div className="w-full py-24 px-32">
        <div className="w-full flex justify-between items-center flex-wrap h-40">
          <div className="inline-flex mt-ms gap-lg justify-start items-center flex-wrap">
            <h2 className="text-h4-sm md:text-h4-md">Överklagan</h2>
          </div>
          {(errand.status === ErrandStatus.Beslutad ||
            errand.status === ErrandStatus.BeslutVerkstallt ||
            errand.status === ErrandStatus.BeslutOverklagat ||
            errand.status === ErrandStatus.ArendeAvslutat) && (
            <Button
              type="button"
              disabled={isErrandLocked(errand) || !allowed}
              size="sm"
              variant="primary"
              color="vattjom"
              inverted={!(isErrandLocked(errand) || !allowed)}
              rightIcon={<LucideIcon name="plus" size={18} />}
              onClick={() => {
                openRegisterAppealHandler();
              }}
              data-cy="register-appeal-button"
            >
              Registrera överklagan
            </Button>
          )}
        </div>
        <div className="py-8 w-full gap-24">
          <p className="w-4/5 pr-16">Här registreras och listas överklaganden gällande ärendets beslut.</p>
          {!errand.appeals?.length && (
            <>
              <Divider className="pt-16" />
              <p className="pt-24 text-dark-disabled">Ingen överklagan har registrerats</p>
            </>
          )}
        </div>
        <div className="mt-md flex flex-col" data-cy="casedata-appeals-list">
          {errand.appeals?.map((appeal, key) => (
            <Fragment key={key}>
              <div
                data-cy={`appeal-${appeal.id}`}
                className="appeal-item flex justify-between gap-12 rounded-sm p-12 text-md border-t hover:bg-gray-100"
                onClick={() => {
                  setModalFetching(true);
                  fetchAppeal(municipalityId, appeal.id)
                    .then((res) => setFetchedAppeal(res.data))
                    .then(() => {
                      setModalFetching(false);
                    })
                    .then((res) => openRegisterAppealHandler());
                }}
              >
                <div className="flex gap-12 w-full">
                  <div className="self-center bg-vattjom-surface-accent p-12 rounded">
                    <LucideIcon name="undo-2" className="block" size={24} />
                  </div>
                  <div className="w-full flex-1">
                    <p className="w-full flex justify-between items-center">
                      <span>
                        <strong>Överklagan</strong> (rättstidsprövning)
                      </span>{' '}
                      <span className="text-small">{`${dayjs(appeal.appealConcernCommunicatedAt).format(
                        'YYYY-MM-DD'
                      )}`}</span>
                    </p>
                    <span className="text-base">{appeal.description}</span>
                  </div>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <AppealFormModal
        allowed={allowed}
        isEdit={fetchedAppeal ? true : false}
        fetchedAppeal={fetchedAppeal}
        modalFetching={modalFetching}
        registerAppealIsOpen={registerAppealIsOpen}
        closeHandler={onCloseRegisterAppealHandler}
        register={register}
        setValue={setValue}
        watch={watch}
        handleSubmit={handleSubmit}
        getValues={getValues}
        errors={errors}
        reset={reset}
        setFetchedAppeal={setFetchedAppeal}
        formState={formState}
        trigger={trigger}
      />
    </>
  );
};
