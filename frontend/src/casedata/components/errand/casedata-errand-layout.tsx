import { CasedataTabsWrapper } from '@casedata/components/errand/casedata-tabs-wrapper';
import { Spinner } from '@sk-web-gui/react';
import { useCasedataStore } from '@stores/index';
import { CasedataErrandHeader } from './casedata-errand-header';
import { CasedataMetadataBand } from './casedata-metadata-band';
import { CasedataRegisterHeader } from './casedata-register-header';
import { SidebarWrapper } from './sidebar/sidebar.wrapper';

interface Props {
  isLoading: boolean;
}

export const CasedataErrandLayout: React.FC<Props> = ({ isLoading }) => {
  const errand = useCasedataStore((s) => s.errand);

  return (
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
                      {(() => {
                        if (errand?.id) {
                          return (
                            <>
                              <CasedataErrandHeader />
                              <CasedataMetadataBand />
                            </>
                          );
                        }
                        if (errand) {
                          return <CasedataRegisterHeader />;
                        }
                        return null;
                      })()}
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
  );
};
