'use client';
import { SaveButtonComponent } from '@casedata/components/save-button/save-button.component';
import ErrandTabsSpacing from '@common/components/layout/errand-tabs-spacing';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Tabs } from '@sk-web-gui/react';
import { default as NextLink } from 'next/link';

export default function RegisterErrandLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErrandTabsSpacing>
        <section className="py-24">
          <div data-cy="registerErrandHeading" className="flex justify-between items-center pt-8">
            <h1 className="text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">Registrera nytt ärende</h1>
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
                registeringNewErrand
                label="Registrera"
                color="vattjom"
                icon={<LucideIcon name="arrow-right" size={18} />}
              />
            </div>
          </div>
        </section>
        <section className="bg-transparent pb-4">
          <div className="container m-auto bg-transparent py-12">
            <div className="mb-xl">
              <Tabs
                className="border-1 rounded-12 bg-background-content pt-22 pl-5"
                tabslistClassName="border-0 -m-b-12 flex-wrap ml-10"
                panelsClassName="border-t-1"
                size="sm"
              >
                <Tabs.Item>
                  <Tabs.Button className={'text-base'}>
                    <NextLink href={`/arende/registrera`} className="block w-full h-full">
                      Grundinformation
                    </NextLink>
                  </Tabs.Button>
                  <Tabs.Content>
                    <div className="pt-xl pb-64 px-40">{children}</div>
                  </Tabs.Content>
                </Tabs.Item>
              </Tabs>
            </div>
          </div>
        </section>
      </ErrandTabsSpacing>
    </>
  );
}
