import { CasedataTabsWrapper } from '@casedata/components/errand/casedata-tabs-wrapper';
import { CaseLabels } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import { UiPhase } from '@casedata/interfaces/errand-phase';
import {
  emptyErrand,
  getErrandByErrandNumber,
  getUiPhase,
  isErrandLocked,
} from '@casedata/services/casedata-errand-service';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { PriorityComponent } from '@common/components/priority/priority.component';
import { useAppContext } from '@common/contexts/app.context';
import { Admin, getAdminUsers, getMe } from '@common/services/user-service';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useRouter } from 'next/navigation';
import { Fragment, useEffect, useRef, useState } from 'react';
import { FormProvider, Resolver, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { SaveButtonComponent } from '../save-button/save-button.component';
import { SidebarWrapper } from './sidebar/sidebar.wrapper';
import { FeatureFlags } from '@common/utils/feature-flags';

type IErrandFormData = Pick<
  IErrand,
  'caseType' | 'channel' | 'description' | 'municipalityId' | 'phase' | 'priority' | 'status'
>;

export const CasedataErrandComponent: React.FC<{ id?: string }> = (props) => {
  let formSchema = yup
    .object({
      caseType: yup
        .string()
        .required('Ärendetyp måste anges')
        .test('notDefaultCasetype', 'Ärendetyp måste väljas', (val) => !!val && val !== 'Välj ärendetyp'),
      channel: yup.string(),
      description: yup.string(),
      municipalityId: yup.string().required('Kommun måste anges'),
      phase: yup.string(),
      priority: yup.string(),
      status: yup.object({
        statusType: yup.string(),
      }),
    })
    .required();

  const [isLoading, setIsLoading] = useState(false);
  const {
    municipalityId,
    errand,
    setErrand,
    setAdministrators,
    setUiPhase,
    featureFlags,
  }: {
    municipalityId: string;
    errand: IErrand;
    setErrand: any;
    setAdministrators: (admins: Admin[]) => void;
    setUiPhase: (phase: UiPhase) => void;
    featureFlags: FeatureFlags;
  } = useAppContext();
  const toastMessage = useSnackbar();

  const methods = useForm<IErrand>({
    resolver: yupResolver(formSchema) as unknown as Resolver<IErrand>, //Temporary bypass for resolver
    defaultValues: errand,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
    disabled: isErrandLocked(errand),
  });

  const initialFocus = useRef<HTMLBodyElement>(null);
  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };
  const router = useRouter();
  const { setUser } = useAppContext();

  useEffect(() => {
    getAdminUsers().then((data) => {
      setAdministrators(data);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setInitialFocus();
    getMe()
      .then((user) => {
        setUser(user);
      })
      .catch((e) => {});
    if (props.id) {
      // Existing errand, load it and show it
      setIsLoading(true);
      getErrandByErrandNumber(municipalityId, props.id)
        .then((res) => {
          if (res.error) {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: res.error,
              status: 'error',
            });
          }
          setErrand(res.errand);
          setIsLoading(false);
        })
        .catch(() => {
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: `Något gick fel när ärendet skulle hämtas`,
            status: 'error',
          });
        });
    } else {
      // Registering new errand, show default values
      setErrand(emptyErrand);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (errand) {
      setUiPhase(getUiPhase(errand));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  function estateToText(propertyDesignation?: string) {
    if (!propertyDesignation) {
      return '(saknas)';
    }
    const MunicipalityName = propertyDesignation.toLowerCase().split(' ')[0];
    const propertyName = propertyDesignation
      .toLowerCase()
      .substring(propertyDesignation.toLowerCase().indexOf(' ') + 1);

    return (
      MunicipalityName.charAt(0).toUpperCase() +
      String(MunicipalityName).slice(1) +
      ' ' +
      propertyName.charAt(0).toUpperCase() +
      String(propertyName).slice(1)
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="grow shrink overflow-y-hidden">
        <div className="flex justify-end w-full h-full">
          <div className="flex justify-center overflow-y-auto w-full grow max-lg:mr-[5.6rem]">
            <main className="flex-grow flex justify-center px-24 max-w-errand h-fit w-full pb-40">
              {isLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-start p-28">
                  <Spinner size={4} />
                  <span className="text-gray m-md">Hämtar ärende..</span>
                </div>
              ) : (
                <div className="flex-grow w-full">
                  <section className="bg-transparent pt-24 pb-4">
                    <div className="flex justify-between mb-md w-full">
                      <div className="w-full flex flex-wrap flex-col justify-between">
                        {errand && errand.id ? (
                          <>
                            <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-24 pt-8 w-full">
                              <h1 className="max-md:w-full text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
                                {errand && errand.id
                                  ? CaseLabels.ALL[errand?.caseType as keyof typeof CaseLabels.ALL]
                                  : ''}
                              </h1>
                            </div>
                            <div className="rounded-cards">
                              <div className="flex gap-x-32 gap-y-8 bg-background-color-mixin-1 rounded-button p-md border">
                                <div className="pr-sm">
                                  <div data-cy="errandStatusLabel" className="font-bold">
                                    Ärendestatus
                                  </div>
                                  <div data-cy="errandStatus">{errand?.status?.statusType}</div>
                                </div>
                                <div className="pr-sm">
                                  <div className="font-bold" data-cy="errandPriorityLabel">
                                    Prioritet
                                  </div>
                                  <div>
                                    <span className="flex gap-sm items-center">
                                      <PriorityComponent priority={errand?.priority} />
                                    </span>
                                  </div>
                                </div>

                                <div className="pr-sm">
                                  <div data-cy="errandRegisteredLabel" className="font-bold">
                                    Registrerat
                                  </div>
                                  <div data-cy="errandRegistered">{errand?.created}</div>
                                </div>
                                <div className="pr-sm">
                                  <div className="font-bold" data-cy="errandStakeholderLabel">
                                    Ärendeägare
                                  </div>
                                  <div data-cy="errandStakeholder">
                                    {(() => {
                                      const owner = getOwnerStakeholder(errand);
                                      if (!owner) return '(saknas)';
                                      if (owner.firstName && owner.lastName) {
                                        return `${owner.firstName} ${owner.lastName}`;
                                      }
                                      if (owner.organizationName) {
                                        return owner.organizationName;
                                      }
                                      return '(saknas)';
                                    })()}
                                  </div>
                                </div>

                                {featureFlags?.useFacilities ? (
                                  <div className="pr-sm w-[40%]">
                                    <div className="font-bold">Fastighetsbeteckning</div>
                                    <div>
                                      {errand?.facilities?.map((estate, index) => (
                                        <Fragment key={`estate-${estate.id}`}>
                                          {index === 0
                                            ? estateToText(estate?.address?.propertyDesignation)
                                            : ', ' + estateToText(estate?.address?.propertyDesignation)}
                                        </Fragment>
                                      ))}
                                      {errand?.facilities?.length === 0 ? '(saknas)' : null}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="pr-sm w-[40%]">
                                    <>
                                      {getOwnerStakeholder(errand)?.stakeholderType === 'PERSON' ? (
                                        <>
                                          <div className="font-bold" data-cy="errandPersonalNumberLabel">
                                            Personnummer
                                          </div>
                                          <div data-cy="errandPersonalNumber">
                                            {errand && getOwnerStakeholder(errand)?.personalNumber
                                              ? getOwnerStakeholder(errand)?.personalNumber
                                              : '(saknas)'}
                                          </div>
                                        </>
                                      ) : getOwnerStakeholder(errand)?.stakeholderType === 'ORGANIZATION' ? (
                                        <>
                                          <div className="font-bold">Organisationsnummer</div>
                                          <div>
                                            {errand && getOwnerStakeholder(errand)?.organizationNumber
                                              ? getOwnerStakeholder(errand)?.organizationNumber
                                              : '(saknas)'}
                                          </div>
                                        </>
                                      ) : null}
                                    </>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : errand ? (
                          <div data-cy="registerErrandHeading" className="flex justify-between items-center pt-8">
                            <h1 className="text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
                              Registrera nytt ärende
                            </h1>
                            <div className="flex gap-md">
                              <Button
                                variant="tertiary"
                                onClick={() => {
                                  window.close();
                                }}
                              >
                                Avbryt
                              </Button>
                              <SaveButtonComponent
                                registeringNewErrand={typeof errand?.id === 'undefined'}
                                setUnsaved={() => {}}
                                update={() => {}}
                                label="Registrera"
                                color="vattjom"
                                icon={<LucideIcon name="arrow-right" size={18} />}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="bg-transparent pb-4">
                    <div className="bg-transparent py-12">{errand && <CasedataTabsWrapper />}</div>
                  </section>
                </div>
              )}
            </main>
          </div>
          {errand?.id ? <SidebarWrapper /> : null}
        </div>
      </div>
    </FormProvider>
  );
};
