import { useAppContext } from '@common/contexts/app.context';
import { Category } from '@common/data-contracts/supportmanagement/data-contracts';
import { getMe } from '@common/services/user-service';
import { appConfig } from '@config/appconfig';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Spinner, useGui, useSnackbar } from '@sk-web-gui/react';
import {
  SupportErrand,
  defaultSupportErrandInformation,
  getSupportErrandByErrandNumber,
  getSupportErrandById,
  initiateSupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';
import { SupportErrandSummary } from '../support-errand-basics-form/support-errand-summary.component';
import { MessagePortal } from './sidebar/message-portal.component';
import { SidebarWrapper } from './sidebar/sidebar.wrapper';
import { SupportTabsWrapper } from './support-tabs-wrapper';

let formSchema = yup
  .object({
    id: yup.string(),
    category: yup.string().required('Välj ärendekategori'),
    type: yup.string().required('Välj ärendetyp'),
    channel: yup.string().required('Välj kanal'),
    description: yup.string(),
    parameters: yup.array(),
  })
  .required();

export const SupportErrandComponent: React.FC<{ errandNumber?: string }> = ({ errandNumber }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Hämtar ärende..');
  const [categoriesList, setCategoriesList] = useState<Category[]>();
  const [unsavedFacility, setUnsavedFacility] = useState(false);
  const {
    
    supportErrand,
    setSupportErrand,
    supportMetadata,
  }: {
    
    supportErrand: SupportErrand;
    setSupportErrand: (e: any) => void;
    supportMetadata: SupportMetadata;
  } = useAppContext();
  const toastMessage = useSnackbar();

  const methods = useForm<SupportErrand>({
    resolver: yupResolver(formSchema) as any,
    defaultValues: defaultSupportErrandInformation,
    mode: 'onChange', // NOTE: Needed if we want to disable submit until valid
  });

  const initialFocus = useRef(null);
  const setInitialFocus = () => {
    setTimeout(() => {
      initialFocus.current && initialFocus.current.focus();
    });
  };
  const router = useRouter();
  const { setUser } = useAppContext();

  const { theme } = useGui();

  useEffect(() => {
    setCategoriesList(supportMetadata?.categories);
  }, [supportMetadata]);

  useEffect(() => {
    setInitialFocus();
    getMe()
      .then((user) => {
        setUser(user);
      })
      .catch((e) => {});
    if (errandNumber) {
      setIsLoading(true);
      getSupportErrandByErrandNumber(errandNumber)
        .then((res) => {
          if (res.error) {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: res.error,
              status: 'error',
            });
          }
          setSupportErrand(res.errand);
          methods.reset(res.errand);
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
      if (supportErrandIsEmpty(supportErrand) && !isLoading) {
        setIsLoading(true);
        setMessage('Registrerar nytt ärende..');
        initiateSupportErrand()
          .then((result) =>
            setTimeout(() => {
              router.push(`/arende/${result.errandNumber}`);
            }, 10)
          )
          .catch((e) => {
            console.error('Error when initiating errand:', e);
            setIsLoading(false);
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: 'Något gick fel när ärendet skulle initieras',
              status: 'error',
            });
          });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, errandNumber]);

  return (
    <FormProvider {...methods}>
      <div className="grow shrink overflow-y-hidden">
        <div className="flex justify-end w-full pl-24 md:pl-40 h-full">
          <div className="flex justify-center overflow-y-auto w-full grow max-lg:mr-[5.6rem]">
            <main
              className="flex-grow flex justify-center max-w-content h-fit w-full pb-40"
              style={{
                maxWidth: `calc(${theme.spacing['max-content']} + (100vw - ${theme.spacing['max-content']})/2)`,
                minHeight: `calc(100vh - 7.2rem)`,
              }}
            >
              {isLoading ? (
                <div className="h-full w-full flex flex-col items-center justify-start p-28">
                  <Spinner size={4} />
                  <span className="text-gray m-md">{message}</span>
                </div>
              ) : (
                <div className="flex-grow w-full max-w-screen-lg">
                  <section className="bg-transparent pt-24 pb-4">
                    <div className="container m-auto pl-0 pr-24 md:pr-40">
                      <div className="w-full flex flex-wrap flex-col justify-between gap-24">
                        {!supportErrandIsEmpty(supportErrand) ? (
                          <>
                            <h1 className="max-md:w-full text-h2-sm md:text-h2-md xl:text-h2-md mb-0 break-words">
                              {appConfig.features.useThreeLevelCategorization
                                ? supportErrand.labels.find((l) => l.classification === 'TYPE')?.displayName ??
                                  '(Ärendetyp saknas)'
                                : categoriesList?.find((c) => c.name === supportErrand?.classification?.category)
                                    ?.displayName}
                            </h1>
                            {/* TODO: Add some logic or featureflag for this component to be displayed */}
                            {process.env.NEXT_PUBLIC_APPLICATION === 'IAF' && <SupportErrandSummary />}
                          </>
                        ) : supportErrand ? (
                          <div className="flex justify-between items-center pt-8">
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
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="bg-transparent pb-4">
                    <div className="container m-auto bg-transparent py-12 pl-0 pr-24 md:pr-40">
                      {supportErrand && (
                        <>
                          <SupportTabsWrapper setUnsavedFacility={setUnsavedFacility} />
                          <MessagePortal />
                        </>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </main>
          </div>
          <SidebarWrapper setUnsavedFacility={setUnsavedFacility} unsavedFacility={unsavedFacility} />
        </div>
      </div>
    </FormProvider>
  );
};
