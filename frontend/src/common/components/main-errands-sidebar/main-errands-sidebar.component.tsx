import { getApplicationEnvironment, getApplicationName, isLOP } from '@common/services/application-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Badge, Button, Divider, Logo } from '@sk-web-gui/react';
import { SupportNotificationsBell } from '@supportmanagement/components/support-notifications/support-notifications-bell';
import { SupportNotificationsWrapper } from '@supportmanagement/components/support-notifications/support-notifications-wrapper';
import { SupportManagementFilterStatus } from '@supportmanagement/components/supportmanagement-filtering/components/supportmanagement-filter-status.component';
import {
  SupportManagementFilter,
  SupportManagementValues,
} from '@supportmanagement/components/supportmanagement-filtering/supportmanagement-filtering.component';
import NextLink from 'next/link';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

export const MainErrandsSidebar: React.FC<{
  showAttestationTable;
  setShowAttestationTable;
}> = ({ showAttestationTable, setShowAttestationTable }) => {
  const filterForm = useForm<SupportManagementFilter>({ defaultValues: SupportManagementValues });
  const { user } = useAppContext();
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
        <div>
          <MainTitle />
        </div>
        <div className="py-24 h-fit flex gap-12 items-center justify-between">
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
          <SupportNotificationsBell toggleShow={() => setShowNotifications(!showNotifications)} />
        </div>
        <Divider />
        <div className="flex flex-col gap-8 py-24">
          <FormProvider {...filterForm}>
            <SupportManagementFilterStatus
              showAttestationTable={showAttestationTable}
              setShowAttestationTable={setShowAttestationTable}
            />
          </FormProvider>
        </div>
        {isLOP() && user.permissions?.canViewAttestations && getApplicationEnvironment() === 'TEST' && (
          <>
            <Divider />
            <div className="flex flex-col gap-8 py-24">
              <Button
                onClick={() => setShowAttestationTable(true)}
                leftIcon={<LucideIcon name="square-pen" />}
                className="w-full text-right justify-between"
                variant={showAttestationTable ? 'primary' : 'ghost'}
              >
                <span className="w-full flex justify-between">
                  Attestering
                  <Badge
                  /* TODO inverted={button.key !== selectedErrandStatus}
                color={button.key === selectedErrandStatus ? 'tertiary' : 'vattjom'}
                counter={button.totalStatusErrands || '0'}*/
                  />
                </span>
              </Button>
            </div>
          </>
        )}
      </div>
      <SupportNotificationsWrapper show={showNotifications} setShow={setShowNotifications} />
    </aside>
  );
};
