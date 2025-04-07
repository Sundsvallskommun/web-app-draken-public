import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { getApplicationEnvironment } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import { CookieConsent, Link } from '@sk-web-gui/react';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import Head from 'next/head';
import NextLink from 'next/link';
import { useState } from 'react';
import { MainErrandsSidebar } from '../main-errands-sidebar/main-errands-sidebar.component';

export default function SidebarLayout({ title, children, showAttestationTable, setShowAttestationTable }) {
  const { user, errand, supportErrand }: { user: User; errand: IErrand; supportErrand: SupportErrand } =
    useAppContext();
  const applicationEnvironment = getApplicationEnvironment();
  const hostName = window.location.hostname;

  const [open, setOpen] = useState(true);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={appConfig.applicationName} />
      </Head>
      <div className="min-h-screen w-full">
        <div className="flex grow w-full">
          <MainErrandsSidebar
            open={open}
            setOpen={setOpen}
            showAttestationTable={showAttestationTable}
            setShowAttestationTable={setShowAttestationTable}
          />{' '}
          <div className={`w-full grow flex ${open ? 'pl-[32rem]' : 'pl-[5.6rem]'} transition-all`}>{children}</div>
        </div>
      </div>

      <CookieConsent
        title={`Kakor på ${hostName}`}
        body={
          <p>
            Vi använder kakor, cookies, för att ge dig en förbättrad upplevelse, sammanställa statistik och för att viss
            nödvändig funktionalitet ska fungera på webbplatsen.{' '}
            <NextLink href="/kakor" passHref legacyBehavior>
              <Link>Läs mer om hur vi använder kakor</Link>
            </NextLink>
          </p>
        }
        cookies={[
          {
            optional: false,
            displayName: 'Nödvändiga kakor',
            description:
              'Dessa kakor är nödvändiga för att webbplatsen ska fungera och kan inte stängas av i våra system.',
            cookieName: 'nessecary',
          },
          {
            optional: true,
            displayName: 'Funktionella kakor',
            description: ' Dessa kakor ger förbättrade funktioner på webbplatsen.',
            cookieName: 'func',
          },
          {
            optional: true,
            displayName: 'Kakor för statistik',
            description:
              'Dessa kakor tillåter oss att räkna besök och trafikkällor, så att vi kan mäta och förbättra prestanda på vår webbplats.',
            cookieName: 'stats',
          },
        ]}
        resetConsentOnInit={false}
        onConsent={(cookies) => {
          // NOTE: do stuff with cookies?
        }}
      />

      {/* <Footer color="gray" /> */}
    </>
  );
}
