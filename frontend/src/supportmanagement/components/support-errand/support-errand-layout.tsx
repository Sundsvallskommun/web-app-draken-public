import { useSupportStore } from '@stores/index';
import { Spinner, useGui } from '@sk-web-gui/react';
import { useState } from 'react';
import { MessagePortal } from './sidebar/message-portal.component';
import { SidebarWrapper } from './sidebar/sidebar.wrapper';
import { SupportErrandHeader } from './support-errand-header';
import { SupportTabsWrapper } from './support-tabs-wrapper';

interface Props {
  isLoading: boolean;
  loadingMessage: string;
}

export const SupportErrandLayout: React.FC<Props> = ({ isLoading, loadingMessage }) => {
  const [unsavedFacility, setUnsavedFacility] = useState(false);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const { theme } = useGui();

  return (
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
                <span className="text-gray m-md">{loadingMessage}</span>
              </div>
            ) : (
              <div className="flex-grow w-full max-w-screen-lg">
                <section className="bg-transparent pt-24 pb-4">
                  <div className="container m-auto pl-0 pr-24 md:pr-40">
                    <div className="w-full flex flex-wrap flex-col justify-between gap-24">
                      <SupportErrandHeader />
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
  );
};
