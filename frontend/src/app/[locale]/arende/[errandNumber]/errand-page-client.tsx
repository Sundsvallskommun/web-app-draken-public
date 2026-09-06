'use client';

import { appConfig } from '@config/appconfig';
import { applicationUi } from '@dragon';
import Layout from '@shell/layout/layout.component';
import { useConfigStore } from '@stores/index';
import NextLink from 'next/link';
import { useRef } from 'react';

interface ErrandPageClientProps {
  errandNumber: string;
}

export function ErrandPageClient({ errandNumber }: Readonly<ErrandPageClientProps>) {
  const municipalityId = useConfigStore((s) => s.municipalityId);

  const initialFocus = useRef<HTMLBodyElement>(null);
  const setInitalFocus = () => {
    setTimeout(() => {
      initialFocus.current?.focus();
    });
  };

  return (
    <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
      <Layout title={`${appConfig.applicationName} - Pågående ärende`}>
        <NextLink
          href="#content"
          passHref
          tabIndex={0}
          onClick={() => setInitalFocus()}
          className="sr-only focus:not-sr-only bg-primary-light border-2 border-black p-4 text-black inline-block focus:absolute focus:top-0 focus:left-0 focus:right-0 focus:m-auto focus:w-80 text-center"
        >
          Hoppa till innehåll
        </NextLink>

        {!!municipalityId && <applicationUi.Errand />}
      </Layout>
    </div>
  );
}
