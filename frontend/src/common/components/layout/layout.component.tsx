import { UiPhaseWrapper } from '@casedata/components/errand/ui-phase/ui-phase-wrapper';
import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isIK, isKA, isKC, isLOP, isMEX, isPT } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, CookieConsent, Divider, Link, Logo, PopupMenu, UserMenu, useThemeQueries } from '@sk-web-gui/react';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import Head from 'next/head';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { PageHeader } from './page-header.component';
import { userMenuGroups } from './userMenuGroups';
import { CasedataStatusLabelComponent } from '@casedata/components/ongoing-casedata-errands/components/casedata-status-label.component';

export default function Layout({ title, children }) {
  const {
    user,
    errand,
    supportErrand,
    supportMetadata,
  }: { user: User; errand: IErrand; supportErrand: SupportErrand; supportMetadata: SupportMetadata } = useAppContext();
  const applicationEnvironment = getApplicationEnvironment();
  const { isMinLargeDevice } = useThemeQueries();
  const pathName = usePathname();
  const errandNumber = appConfig.isCaseData
    ? errand?.errandNumber
    : appConfig.isSupportManagement
    ? supportErrand?.errandNumber
    : undefined;
  const hostName = window.location.hostname;

  const MainTitle = () => (
    <NextLink
      href="/"
      className="no-underline"
      aria-label={`Draken - ${
        appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
      }. Gå till startsidan.`}
    >
      <Logo
        variant="service"
        title={'Draken'}
        symbol={appConfig.symbol}
        subtitle={appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')}
      />
    </NextLink>
  );

  const SingleErrandTitle = () => (
    <div className="flex items-center gap-24 py-10">
      <a
        href={`${process.env.NEXT_PUBLIC_BASEPATH}`}
        title={`Draken - ${
          appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
        }. Gå till startsidan.`}
      >
        <Logo variant="symbol" symbol={appConfig.symbol} className="h-40" />
      </a>
      <span className="text-large">
        {appConfig.isSupportManagement ? (
          <>
            <SupportStatusLabelComponent status={supportErrand.status} resolution={supportErrand.resolution} />
            <span className="font-bold ml-8">
              {supportMetadata?.categories
                ?.find((t) => t.name === supportErrand.category)
                ?.types.find((t) => t.name === supportErrand.classification.type)?.displayName ||
                supportErrand.type}{' '}
            </span>
            <span className="text-small">({errandNumber})</span>
          </>
        ) : null}
        {appConfig.isCaseData ? (
          <>
            <CasedataStatusLabelComponent status={errand?.status?.statusType} />
            <span className="font-bold ml-8">Ärende: </span>
            {errandNumber}
          </>
        ) : null}
      </span>
    </div>
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={appConfig.applicationName} />
      </Head>
      <div className="relative z-[15] bg-background-content">
        <PageHeader
          logo={pathName.includes('arende') && errandNumber !== undefined ? <SingleErrandTitle /> : <MainTitle />}
          userMenu={
            <div className="flex items-center h-fit">
              <span data-cy="usermenu">
                <UserMenu
                  initials={`${user.firstName[0]}${user.lastName[0]}`}
                  menuTitle={`${user.name} (${user.username})`}
                  menuSubTitle=""
                  menuGroups={userMenuGroups}
                  buttonRounded={false}
                  buttonSize="sm"
                />
              </span>

              <Divider orientation="vertical" className="mx-24" />
              <Link
                href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}
                target="_blank"
                data-cy="register-new-errand-button"
              >
                <Button
                  color={'primary'}
                  variant={'tertiary'}
                  rightIcon={<LucideIcon name="external-link" color="primary" variant="tertiary" />}
                >
                  Nytt ärende
                </Button>
              </Link>
            </div>
          }
          mobileMenu={
            <PopupMenu align="end">
              <PopupMenu.Button iconButton>
                <LucideIcon name="menu" />
              </PopupMenu.Button>
              <PopupMenu.Panel>
                <PopupMenu.Group>
                  <div className="font-bold">{`${user.name} (${user.username})`}</div>
                </PopupMenu.Group>
                <PopupMenu.Items>
                  <PopupMenu.Group>
                    {isKC() || isIK() || isKA() || isLOP() || isMEX() ? (
                      <PopupMenu.Item>
                        <Link href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}>
                          <LucideIcon name="external-link" className="h-md" color="primary" variant="tertiary" /> Nytt
                          ärende
                        </Link>
                      </PopupMenu.Item>
                    ) : null}
                  </PopupMenu.Group>

                  {userMenuGroups.map((group, groupindex) => (
                    <PopupMenu.Group key={`mobilegroup-${groupindex}`}>
                      {group.elements.map((item, itemindex) => (
                        <Fragment key={`mobilegroup-${groupindex}-${itemindex}`}>{item.element()}</Fragment>
                      ))}
                    </PopupMenu.Group>
                  ))}
                </PopupMenu.Items>
              </PopupMenu.Panel>
            </PopupMenu>
          }
          bottomContent={
            ((isMEX() && !isMinLargeDevice) || (isPT() && !isMinLargeDevice)) &&
            (pathName === '/registrera' || pathName.includes('arende')) ? (
              <UiPhaseWrapper />
            ) : null
          }
        >
          {((isMEX() && isMinLargeDevice) || (isPT() && isMinLargeDevice)) &&
          (pathName === '/registrera' || pathName.includes('arende')) ? (
            <UiPhaseWrapper />
          ) : null}
        </PageHeader>
      </div>

      {children}

      <CookieConsent
        title={`Kakor på ${hostName}`}
        body={
          <p>
            Vi använder kakor, cookies, för att ge dig en förbättrad upplevelse, sammanställa statistik och för att viss
            nödvändig funktionalitet ska fungera på webbplatsen.{' '}
            <NextLink href="/kakor" passHref>
              <Button variant={'link'}>Läs mer om hur vi använder kakor</Button>
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
