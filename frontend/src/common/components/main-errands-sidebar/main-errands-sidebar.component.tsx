import { CaseDataFilter } from '@casedata/components/casedata-filtering/casedata-filtering.component';
import { CasedataFilterSidebarStatusSelector } from '@casedata/components/casedata-filtering/components/casedata-filter-sidebarstatus-selector.component';
import { CaseStatusValues } from '@casedata/components/casedata-filtering/components/casedata-filter-status.component';
import { NotificationsBell } from '@common/components/notifications/notifications-bell';
import { NotificationsWrapper } from '@common/components/notifications/notifications-wrapper';
import { getApplicationEnvironment } from '@common/services/application-service';
import { attestationEnabled, isNotificicationEnabled } from '@common/services/feature-flag-service';
import { appConfig } from '@config/appconfig';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Badge, Button, cx, Divider, Logo, UserMenu } from '@sk-web-gui/react';
import { SupportManagementFilterSidebarStatusSelector } from '@supportmanagement/components/supportmanagement-filtering/components/supportmanagement-filter-sidebarstatus-selector.component';
import {
  SupportManagementFilter,
  SupportManagementValues,
} from '@supportmanagement/components/supportmanagement-filtering/supportmanagement-filtering.component';
import NextLink from 'next/link';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { userMenuGroups } from '../layout/userMenuGroups';

export const MainErrandsSidebar: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
  open;
  setOpen;
}> = ({ showAttestationTable, setShowAttestationTable, open, setOpen }) => {
  const suppportManagementFilterForm = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
  const casedataFilterForm = useForm<CaseDataFilter>({ defaultValues: CaseStatusValues });
  const { user, billingRecords, isLoading }: AppContextInterface = useAppContext();
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
        symbol={appConfig.symbol}
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
          {isNotificicationEnabled() && (
            <NotificationsBell toggleShow={() => setShowNotifications(!showNotifications)} />
          )}
        </div>
        <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
        <div className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}>
          {appConfig.isSupportManagement ? (
            <FormProvider {...suppportManagementFilterForm}>
              <SupportManagementFilterSidebarStatusSelector
                showAttestationTable={showAttestationTable}
                setShowAttestationTable={setShowAttestationTable}
                iconButton={!open}
              />
            </FormProvider>
          ) : null}
          {appConfig.isCaseData ? (
            <FormProvider {...casedataFilterForm}>
              <CasedataFilterSidebarStatusSelector iconButton={!open} />
            </FormProvider>
          ) : null}
        </div>
        {attestationEnabled(user) && (
          <>
            <Divider className={cx(open ? '' : 'w-[4rem] mx-auto')} />
            <div className={cx('flex flex-col gap-8', open ? 'py-24' : 'items-center justify-center py-15')}>
              <Button
                onClick={() => setShowAttestationTable(true)}
                leftIcon={<LucideIcon name="square-pen" />}
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
                          : billingRecords.totalElements > 999
                          ? '999+'
                          : billingRecords.totalElements || '0'
                      }
                    />
                  </span>
                )}
              </Button>
            </div>
          </>
        )}
        <div
          className={cx('absolute bottom-[2.4rem]', open ? 'right-[2.4rem]' : 'left-1/2 transform -translate-x-1/2')}
        >
          <Button
            color="primary"
            size={'md'}
            variant="tertiary"
            aria-label={open ? 'Stäng sidomeny' : 'Öppna sidomeny'}
            iconButton
            leftIcon={open ? <LucideIcon name="chevrons-left" /> : <LucideIcon name="chevrons-right" />}
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>

      {isNotificicationEnabled() && <NotificationsWrapper show={showNotifications} setShow={setShowNotifications} />}
    </aside>
  );
};
