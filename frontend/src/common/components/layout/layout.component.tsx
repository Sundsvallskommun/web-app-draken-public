import { UiPhaseWrapper } from '@casedata/components/errand/ui-phase/ui-phase-wrapper';
import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import {
  getApplicationEnvironment,
  getApplicationName,
  isIS,
  isKC,
  isLOP,
  isMEX,
  isPT,
} from '@common/services/application-service';
import { useMediaQuery } from '@mui/material';
import {
  Button,
  CookieConsent,
  Divider,
  LucideIcon as Icon,
  Label,
  Link,
  Logo,
  PopupMenu,
  UserMenu,
  useGui,
} from '@sk-web-gui/react';
import { Resolution, Status, StatusLabel, SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import Head from 'next/head';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Fragment } from 'react';
import { PageHeader } from './page-header.component';
import { userMenuGroups } from './userMenuGroups';

export default function Layout({ title, children }) {
  const {
    user,
    errand,
    supportErrand,
    supportMetadata,
  }: { user: User; errand: IErrand; supportErrand: SupportErrand; supportMetadata: SupportMetadata } = useAppContext();
  const applicationName = getApplicationName();
  const applicationEnvironment = getApplicationEnvironment();
  const { theme } = useGui();
  const isXl = useMediaQuery(`screen and (min-width:${theme.screens.xl})`);
  const router = useRouter();
  const errandNumber =
    isMEX() || isPT() ? errand?.errandNumber : isKC() || isIS() || isLOP() ? supportErrand?.errandNumber : undefined;
  const hostName = window.location.hostname;

  const MainTitle = () => (
    <NextLink
      href="/"
      className="no-underline"
      aria-label={`Draken - ${
        applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
      }. Gå till startsidan.`}
    >
      <Logo
        variant="service"
        title={'Draken'}
        subtitle={applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')}
      />
    </NextLink>
  );

  const StatusLabelComponent = (status: string, resolution: string) => {
    let color,
      inverted = false,
      icon = null;
    switch (status) {
      case 'SOLVED':
        color = 'primary';
        icon = resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM ? 'split' : 'check';
        break;
      case 'ONGOING':
        color = 'gronsta';
        icon = 'pen';
        break;
      case 'NEW':
        color = 'vattjom';
        break;
      case 'PENDING':
        color = 'gronsta';
        inverted = true;
        icon = 'clock-10';
        break;
      case 'SUSPENDED':
        color = 'warning';
        inverted = true;
        icon = 'circle-pause';
        break;
      case 'ASSIGNED':
        color = 'warning';
        inverted = false;
        icon = 'circle-pause';
        break;
      default:
        color = 'tertiary';
        break;
    }
    return (
      <Label rounded inverted={inverted} color={color} className={`max-h-full h-auto mr-8`}>
        {icon ? <Icon name={icon} size={16} /> : null}{' '}
        {resolution === Resolution.REGISTERED_EXTERNAL_SYSTEM && status === Status.SOLVED
          ? 'Eskalerat'
          : StatusLabel[status]}
      </Label>
    );
  };

  const SingleErrandTitle = () => (
    <div className="flex items-center gap-24 py-10">
      <a
        href={`${process.env.NEXT_PUBLIC_BASEPATH}`}
        title={`Draken - ${
          applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
        }. Gå till startsidan.`}
      >
        <Logo variant="symbol" className="h-40" />
      </a>
      <span className="text-large">
        {isKC() || isIS() || isLOP() ? (
          <>
            {StatusLabelComponent(supportErrand.status, supportErrand.resolution)}
            <span className="font-bold">
              {supportMetadata?.categories
                ?.find((t) => t.name === supportErrand.category)
                ?.types.find((t) => t.name === supportErrand.classification.type)?.displayName ||
                supportErrand.type}{' '}
            </span>
            <span className="text-small">({errandNumber})</span>
          </>
        ) : (
          <>
            <span className="font-bold">Ärende: </span>
            {errandNumber}
          </>
        )}
      </span>
    </div>
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={applicationName} />
      </Head>
      <div className="relative z-[15] bg-background-content">
        <PageHeader
          logo={
            router.pathname.includes('arende') && errandNumber !== undefined ? <SingleErrandTitle /> : <MainTitle />
          }
          userMenu={
            <div className="flex items-center h-fit">
              <span data-cy="usermenu">
                <UserMenu
                  initials={`${user.firstName[0]}${user.lastName[0]}`}
                  menuTitle={`${user.name} (${user.username})`}
                  menuSubTitle=""
                  menuGroups={userMenuGroups}
                  buttonRounded
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
                  color={isMEX() || isPT() ? 'primary' : 'vattjom'}
                  variant={isMEX() || isPT() ? 'tertiary' : 'primary'}
                  rightIcon={
                    isMEX() || isPT() ? <Icon name="external-link" color="primary" variant="tertiary" /> : null
                  }
                >
                  Nytt ärende
                </Button>
              </Link>
            </div>
          }
          mobileMenu={
            <PopupMenu align="end">
              <PopupMenu.Button iconButton>
                <Icon name="menu" />
              </PopupMenu.Button>
              <PopupMenu.Panel>
                <PopupMenu.Group>
                  <div className="font-bold">{`${user.name} (${user.username})`}</div>
                </PopupMenu.Group>
                <PopupMenu.Items>
                  <PopupMenu.Group>
                    <PopupMenu.Item>
                      <Link href={`${process.env.NEXT_PUBLIC_BASEPATH}/registrera`}>
                        <Icon name="external-link" className="h-md" color="primary" variant="tertiary" /> Nytt ärende
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
            ((isMEX() && !isXl) || (isPT() && !isXl)) &&
            (router.pathname === '/registrera' || router.pathname.includes('arende')) ? (
              <UiPhaseWrapper />
            ) : null
          }
        >
          {((isMEX() && isXl) || (isPT() && isXl)) &&
          (router.pathname === '/registrera' || router.pathname.includes('arende')) ? (
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
