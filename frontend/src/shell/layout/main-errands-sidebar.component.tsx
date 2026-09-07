import { userMenuGroups } from '@common/components/layout/userMenuGroups';
import { NotificationsBell } from '@common/components/notifications/notifications-bell';
import { NotificationsWrapper } from '@common/components/notifications/notifications-wrapper';
import { getApplicationEnvironment } from '@common/services/application-service';
import { attestationEnabled, contractsEnabled } from '@common/services/feature-flag-service';
import { appConfig } from '@config/appconfig';
import { applicationUi } from '@dragon';
import { Badge, Button, cx, Divider, Logo, UserMenu } from '@sk-web-gui/react';
import { useBillingStore } from '@stores/billing-store';
import { useConfigStore } from '@stores/config-store';
import { useUserStore } from '@stores/user-store';
import { AngeSymbol } from '@styles/ange-symbol';
import { ChevronsLeft, ChevronsRight, FileText, SquarePen } from 'lucide-react';
import NextLink from 'next/link';
import { FC, useState } from 'react';

export const MainErrandsSidebar: FC<{
  showAttestationTable: boolean;
  setShowAttestationTable: (show: boolean) => void;
  showContractTable: boolean;
  setShowContractTable: (show: boolean) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}> = ({ showAttestationTable, setShowAttestationTable, showContractTable, setShowContractTable, open, setOpen }) => {
  const user = useUserStore((s) => s.user);
  const billingRecords = useBillingStore((s) => s.billingRecords);
  const isLoading = useConfigStore((s) => s.isLoading);
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [showNotifications, setShowNotifications] = useState(false);
  const applicationEnvironment = getApplicationEnvironment();

  const MainTitle = (open: boolean) => (
    <NextLink
      href="/"
      className="no-underline"
      aria-label={`Draken - ${
        appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')
      }. Gå till startsidan.`}
    >
      <Logo
        className={cx(open ? '' : 'w-[2.8rem]')}
        variant={open ? 'service' : 'symbol'}
        symbol={municipalityId === '2260' ? <AngeSymbol /> : undefined}
        title={'Draken'}
        subtitle={appConfig.applicationName + (applicationEnvironment ? ` ${applicationEnvironment}` : '')}
      />
    </NextLink>
  );
  return (
    <aside
      data-cy="overview-aside"
      className={cx(
        'fixed left-0 transition-all ease-in-out duration-150 flex grow z-10 bg-vattjom-background-200 min-h-screen',
        open ? 'max-lg:shadow-100 sm:w-[32rem] sm:min-w-[32rem]' : 'w-[5.6rem]'
      )}
    >
      <div className={cx('h-full w-full', open ? 'p-24' : '')}>
        <div className={cx('mb-24', open ? '' : 'flex flex-col items-center justify-center pt-[1rem]')}>
          {MainTitle(open)}
        </div>
        <div
          className={cx(
            'h-fit items-center',
            open ? 'pb-24 flex gap-12 justify-between' : 'pb-15 flex flex-col items-center justify-center'
          )}
        >
          {open && (
            <div className="flex gap-12 justify-between items-center">
              <UserMenu
                data-cy="avatar-aside"
                initials={`${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`}
                menuTitle={`${user.firstName} ${user.lastName} (${user.username})`}
                menuGroups={userMenuGroups}
                buttonSize="md"
                className="flex-shrink-0"
                buttonRounded={false}
                color="vattjom"
              />
              <span className="leading-tight h-fit font-bold mb-0" data-cy="userinfo">
                {user.firstName} {user.lastName}
              </span>
            </div>
          )}
          <NotificationsBell toggleShow={() => setShowNotifications(!showNotifications)} />
        </div>
        <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
        <div className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}>
          <applicationUi.StatusFilters
            showAttestationTable={showAttestationTable}
            setShowAttestationTable={setShowAttestationTable}
            showContractTable={showContractTable}
            setShowContractTable={setShowContractTable}
            iconButton={!open}
          />
        </div>
        {attestationEnabled(user) && (
          <>
            <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
            <div className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}>
              <Button
                onClick={() => setShowAttestationTable(true)}
                leftIcon={<SquarePen />}
                className={`${open && 'justify-start'} ${!showAttestationTable && 'hover:bg-dark-ghost'}`}
                variant={showAttestationTable ? 'primary' : 'ghost'}
                iconButton={!open}
              >
                {open && (
                  <span className="w-full flex justify-between">
                    Godkänn fakturor
                    <Badge
                      className="min-w-fit px-4"
                      inverted={!showAttestationTable}
                      color={showAttestationTable ? 'tertiary' : 'vattjom'}
                      counter={
                        isLoading
                          ? '-'
                          : (billingRecords.totalElements ?? 0) > 999
                          ? '999+'
                          : billingRecords.totalElements ?? '0'
                      }
                    />
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
        {contractsEnabled() ? (
          <>
            <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
            <div className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}>
              <Button
                onClick={() => setShowContractTable(true)}
                leftIcon={<FileText />}
                className={`${open && 'justify-start'} ${!showContractTable && 'hover:bg-dark-ghost'}`}
                variant={showContractTable ? 'primary' : 'ghost'}
                iconButton={!open}
              >
                {open && <span className="w-full flex justify-between">Avtalsöversikt</span>}
              </Button>
            </div>
          </>
        ) : null}
        <div
          className={cx('absolute bottom-[2.4rem]', open ? 'right-[2.4rem]' : 'left-1/2 transform -translate-x-1/2')}
        >
          <Button
            color="primary"
            size={'md'}
            variant="tertiary"
            aria-label={open ? 'Stäng sidomeny' : 'Öppna sidomeny'}
            iconButton
            leftIcon={open ? <ChevronsLeft /> : <ChevronsRight />}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>

      <NotificationsWrapper
        source={applicationUi.notifications}
        show={showNotifications}
        setShow={setShowNotifications}
      />
    </aside>
  );
};
