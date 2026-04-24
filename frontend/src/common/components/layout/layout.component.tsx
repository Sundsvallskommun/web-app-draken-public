import { UiPhaseWrapper } from '@casedata/components/errand/ui-phase/ui-phase-wrapper';
import { CasedataStatusLabelComponent } from '@casedata/components/ongoing-casedata-errands/components/casedata-status-label.component';
import { getApplicationEnvironment } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import { Button, CookieConsent, Divider, Link, Logo, PopupMenu, UserMenu, useThemeQueries } from '@sk-web-gui/react';
import { AngeSymbol } from '@styles/ange-symbol';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import { Link as RouterLink, useLocation, useParams } from 'react-router-dom';
import { Fragment, useEffect, useState } from 'react';

import { PageHeader } from './page-header.component';
import { userMenuGroups } from './userMenuGroups';
import { ExternalLink, Menu } from 'lucide-react';
import { useCasedataStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';

export default function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  const user = useUserStore((s) => s.user);
  const applicationEnvironment = getApplicationEnvironment();
  const { isMinLargeDevice } = useThemeQueries();
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const pathName = useLocation().pathname ?? '';
  const errand = useCasedataStore((s) => s.errand);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const params = useParams<{ errandNumber?: string }>();
  const errandNumber = params?.errandNumber;
  const [hostName, setHostName] = useState('');

  useEffect(() => {
    setHostName(window.location.hostname);
  }, []);

  const MainTitle = () => (
    <RouterLink
      to="/"
      className="no-underline"
      aria-label={`Draken - ${
        appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
      }. Gå till startsidan.`}
    >
      <Logo
        variant="service"
        title={'Draken'}
        symbol={import.meta.env.VITE_MUNICIPALITY_ID === '2260' ? <AngeSymbol /> : undefined}
        subtitle={appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')}
      />
    </RouterLink>
  );

  const SingleErrandTitle = () => (
    <div className="flex items-center gap-24 py-10">
      <a
        href={`${import.meta.env.VITE_BASEPATH}`}
        title={`Draken - ${
          appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
        }. Gå till startsidan.`}
      >
        <Logo
          variant="symbol"
          symbol={import.meta.env.VITE_MUNICIPALITY_ID === '2260' ? <AngeSymbol /> : undefined}
          className="h-40"
        />
      </a>
      <span className="text-large">
        {appConfig.isSupportManagement ? (
          <>
            <SupportStatusLabelComponent
              status={supportErrand?.status ?? ''}
              resolution={supportErrand?.resolution ?? ''}
              actions={supportErrand?.actions ?? []}
            />
            <span className="font-bold ml-8">
              {appConfig.features.useThreeLevelCategorization
                ? supportErrand?.labels?.find((l) => l.classification === 'TYPE')?.displayName ?? '(Ärendetyp saknas)'
                : supportMetadata?.categories
                    ?.find((t) => t.name === supportErrand?.category)
                    ?.types?.find((t) => t.name === supportErrand?.classification?.type)?.displayName ||
                  supportErrand?.type}{' '}
            </span>
            <span className="text-small">({errandNumber})</span>
          </>
        ) : null}
        {appConfig.isCaseData ? (
          <>
            <CasedataStatusLabelComponent status={errand?.status?.statusType ?? ''} />
            <span className="font-bold ml-8">Ärende: </span>
            {errandNumber}
          </>
        ) : null}
      </span>
    </div>
  );

  return (
    <>
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
                href={`${import.meta.env.VITE_BASEPATH}/registrera`}
                target="_blank"
                data-cy="register-new-errand-button"
              >
                <Button color={'primary'} variant={'tertiary'} rightIcon={<ExternalLink />}>
                  Nytt ärende
                </Button>
              </Link>
            </div>
          }
          mobileMenu={
            <PopupMenu align="end">
              <PopupMenu.Button iconButton>
                <Menu />
              </PopupMenu.Button>
              <PopupMenu.Panel>
                <PopupMenu.Group>
                  <div className="font-bold">{`${user.name} (${user.username})`}</div>
                </PopupMenu.Group>
                <PopupMenu.Items>
                  <PopupMenu.Group>
                    <PopupMenu.Item>
                      <Link href={`${import.meta.env.VITE_BASEPATH}/registrera`}>
                        <ExternalLink className="h-md" /> Nytt ärende
                      </Link>
                    </PopupMenu.Item>
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
            appConfig.features.useUiPhases &&
            !isMinLargeDevice &&
            (pathName === '/registrera' || pathName.includes('arende')) ? (
              <UiPhaseWrapper />
            ) : null
          }
        >
          {appConfig.features.useUiPhases &&
          isMinLargeDevice &&
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
            <RouterLink to="/kakor">
              <Button variant={'link'}>Läs mer om hur vi använder kakor</Button>
            </RouterLink>
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
    </>
  );
}
