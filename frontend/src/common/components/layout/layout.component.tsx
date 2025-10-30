import { UiPhaseWrapper } from '@casedata/components/errand/ui-phase/ui-phase-wrapper';
import { CasedataStatusLabelComponent } from '@casedata/components/ongoing-casedata-errands/components/casedata-status-label.component';
import { IErrand } from '@casedata/interfaces/errand';
import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { getApplicationEnvironment, isIK, isKA, isKC, isLOP, isMEX, isPT } from '@common/services/application-service';
import { appConfig } from '@config/appconfig';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, Link, Logo, PopupMenu, UserMenu, useThemeQueries } from '@sk-web-gui/react';
import { SupportStatusLabelComponent } from '@supportmanagement/components/ongoing-support-errands/components/support-status-label.component';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import { PageHeader } from './page-header.component';
import { userMenuGroups } from './userMenuGroups';
import { AngeSymbol } from '@styles/ange-symbol';

export default function BaseErrandLayout({ children }) {
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
        symbol={process.env.NEXT_PUBLIC_MUNICIPALITY_ID === '2260' ? <AngeSymbol /> : undefined}
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
        <Logo
          variant="symbol"
          symbol={process.env.NEXT_PUBLIC_MUNICIPALITY_ID === '2260' ? <AngeSymbol /> : undefined}
          className="h-40"
        />
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
      <div className="bg-background-100 h-screen min-h-screen max-h-screen overflow-hidden w-full flex flex-col">
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
                  href={`${process.env.NEXT_PUBLIC_BASEPATH}/arende/registrera`}
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
      </div>
    </>
  );
}
