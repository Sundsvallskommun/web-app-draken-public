import NextLink from 'next/link';
import {
  getApplicationEnvironment,
  getApplicationName,
  isIK,
  isKC,
  isLOP,
  isMEX,
  isPT,
} from '@common/services/application-service';
import { FormProvider, useForm } from 'react-hook-form';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Badge, Button, Divider, Logo } from '@sk-web-gui/react';
import { NotificationsBell } from '@common/components/notifications/notifications-bell';
import { NotificationsWrapper } from '@common/components/notifications/notifications-wrapper';
import { SupportManagementFilterSidebarStatusSelector } from '@supportmanagement/components/supportmanagement-filtering/components/supportmanagement-filter-sidebarstatus-selector.component';
import {
  SupportManagementFilter,
  SupportManagementValues,
} from '@supportmanagement/components/supportmanagement-filtering/supportmanagement-filtering.component';
import { useState } from 'react';
import { CaseStatusValues } from '@casedata/components/casedata-filtering/components/casedata-filter-status.component';
import { CasedataFilterSidebarStatusSelector } from '@casedata/components/casedata-filtering/components/casedata-filter-sidebarstatus-selector.component';
import { attestationEnabled, isNotificicationEnabled } from '@common/services/feature-flag-service';
import { CaseDataFilter } from '@casedata/components/casedata-filtering/casedata-filtering.component';

export const MainErrandsSidebar: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
}> = ({ showAttestationTable, setShowAttestationTable }) => {
  const suppportManagementFilterForm = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
  const casedataFilterForm = useForm<CaseDataFilter>({ defaultValues: CaseStatusValues });
  const { user, billingRecords }: AppContextInterface = useAppContext();
  const [showNotifications, setShowNotifications] = useState(false);

  const applicationName = getApplicationName();
  const applicationEnvironment = getApplicationEnvironment();

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
  return (
    <aside
      data-cy="overview-aside"
      className="flex-none absolute z-10 bg-vattjom-background-200 h-full min-h-screen max-w-full w-full sm:w-[32rem] sm:min-w-[32rem]"
    >
      <div className="h-full w-full p-24">
        <div className="mb-24">
          <MainTitle />
        </div>
        <div className="pb-24 h-fit flex gap-12 items-center justify-between">
          <div className="flex gap-12 justify-between items-center">
            <Avatar
              data-cy="avatar-aside"
              className="flex-none"
              size="md"
              initials={`${user.firstName.charAt(0).toUpperCase()}${user.lastName.charAt(0).toUpperCase()}`}
              color="vattjom"
            />
            <span className="leading-tight h-fit font-bold mb-0" data-cy="userinfo">
              {user.firstName} {user.lastName}
            </span>
          </div>
          {isNotificicationEnabled() && (
            <NotificationsBell toggleShow={() => setShowNotifications(!showNotifications)} />
          )}
        </div>
        <Divider />
        <div className="flex flex-col gap-8 py-24">
          {isLOP() || isKC() || isIK() ? (
            <FormProvider {...suppportManagementFilterForm}>
              <SupportManagementFilterSidebarStatusSelector
                showAttestationTable={showAttestationTable}
                setShowAttestationTable={setShowAttestationTable}
              />
            </FormProvider>
          ) : (
            <FormProvider {...casedataFilterForm}>
              <CasedataFilterSidebarStatusSelector />
            </FormProvider>
          )}
        </div>
        {attestationEnabled(user) && (
          <>
            <Divider />
            <div className="flex flex-col gap-8 py-24">
              <Button
                onClick={() => setShowAttestationTable(true)}
                leftIcon={<LucideIcon name="square-pen" />}
                className={`justify-start ${!showAttestationTable && 'hover:bg-dark-ghost'}`}
                variant={showAttestationTable ? 'primary' : 'ghost'}
              >
                <span className="w-full flex justify-between">
                  Attestering
                  <Badge
                    className="min-w-fit px-4"
                    inverted={!showAttestationTable}
                    color={showAttestationTable ? 'tertiary' : 'vattjom'}
                    counter={billingRecords.totalElements || '0'}
                  />
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
      {isNotificicationEnabled() && <NotificationsWrapper show={showNotifications} setShow={setShowNotifications} />}
    </aside>
  );
};
