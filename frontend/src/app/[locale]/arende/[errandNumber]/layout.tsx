'use client';
import { SidebarWrapper as CaseDataSidebarWrapper } from '@casedata/components/errand/sidebar/sidebar.wrapper';
import { getErrand, getErrandByErrandNumber, phaseChangeInProgress } from '@casedata/services/casedata-errand-service';
import ErrandBasicInformationSection from '@common/components/layout/errand-basic-information-section.component';
import ErrandTabsSpacing from '@common/components/layout/errand-tabs-spacing';
import { useAppContext } from '@common/contexts/app.context';
import { caseDataTabs, supportManagementTabs } from '@common/tabs/visible-tabs';
import { appConfig } from '@config/appconfig';
import { Spinner, Tabs, useSnackbar } from '@sk-web-gui/react';
import { SidebarWrapper as SupportSidebarWrapper } from '@supportmanagement/components/support-errand/sidebar/sidebar.wrapper';
import { getSupportErrandByErrandNumber } from '@supportmanagement/services/support-errand-service';
import { getSupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { default as NextLink } from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function RegisteredErrandLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { errandNumber } = useParams();
  const { municipalityId, supportErrand, setSupportErrand, setSupportMetadata, setErrand, errand } = useAppContext();
  const toastMessage = useSnackbar();

  useEffect(() => {
    if (!municipalityId || !errandNumber) return;

    if (appConfig.isSupportManagement) {
      getSupportErrandByErrandNumber(errandNumber as string).then((res) => setSupportErrand(res.errand));
      getSupportMetadata(municipalityId).then((res) => setSupportMetadata(res.metadata));
    }
    if (appConfig.isCaseData) {
      getErrandByErrandNumber(municipalityId, errandNumber as string).then((res) => {
        setErrand(res.errand);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, errandNumber]);

  useEffect(() => {
    if (appConfig.isCaseData && errand?.id && phaseChangeInProgress(errand)) {
      setTimeout(() => {
        getErrand(municipalityId, errand.id.toString())
          .then((res) => {
            setErrand(res.errand);
          })
          .catch((e) => {
            toastMessage({
              position: 'bottom',
              closeable: false,
              message: `Något gick fel när ärendet skulle hämtas`,
              status: 'error',
            });
          });
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  if ((appConfig.isSupportManagement && !supportErrand) || (appConfig.isCaseData && !errand)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size={12} />
      </div>
    );
  }

  const tabs = appConfig.isSupportManagement
    ? supportManagementTabs(supportErrand?.errandNumber)
    : caseDataTabs(errand, []);

  return (
    <div className="flex justify-end w-full pl-24 md:pl-40 h-full">
      <ErrandTabsSpacing>
        <ErrandBasicInformationSection />
        <section className="bg-transparent pb-4">
          <div className="container m-auto bg-transparent py-12">
            <div className="mb-xl">
              <Tabs
                className="border-1 rounded-12 bg-background-content pt-22 pl-5"
                tabslistClassName="border-0 -m-b-12 flex-wrap ml-10"
                panelsClassName="border-t-1"
                size="sm"
                current={tabs.filter((tab) => tab.visible).findIndex((tab) => tab.path === pathname)}
              >
                {tabs
                  .filter((tab) => tab.visible)
                  .map((tab) => {
                    return (
                      <Tabs.Item key={tab.label}>
                        <Tabs.Button className={'text-base'}>
                          <NextLink href={tab.path} className="block w-full h-full">
                            {tab.label}
                          </NextLink>
                        </Tabs.Button>
                        <Tabs.Content>
                          <div className="pt-xl pb-64 px-40">{children}</div>
                        </Tabs.Content>
                      </Tabs.Item>
                    );
                  })}
              </Tabs>
            </div>
          </div>
        </section>
      </ErrandTabsSpacing>
      {appConfig.isCaseData && <CaseDataSidebarWrapper />}
      {appConfig.isSupportManagement && <SupportSidebarWrapper />}
    </div>
  );
}
