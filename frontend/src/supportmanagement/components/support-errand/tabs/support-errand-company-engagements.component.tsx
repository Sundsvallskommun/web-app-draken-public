import { engagementRoles } from '@common/services/legal-entity-service';
import { Button, Card, Disclosure, Icon, Table } from '@sk-web-gui/react';
import { SupportPbiCandidate } from '@supportmanagement/services/support-pbi-service';
import { Building2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PbiMarking, SupportErrandPbiCell } from './support-errand-pbi-cell.component';

export const SupportErrandCompanyEngagements: React.FC<{
  engagements: SupportPbiCandidate[];
  initiallyOpen: boolean;
  companyName?: string | null;
  onShowBusinessDescription?: () => void;
  pbiMarking?: PbiMarking;
  pbiNotice?: string;
}> = ({ engagements, initiallyOpen, companyName, onShowBusinessDescription, pbiMarking, pbiNotice }) => {
  const { t } = useTranslation();

  return (
    <Disclosure variant="alt" className="w-full" initalOpen={initiallyOpen}>
      <Disclosure.Header>
        <Disclosure.Icon icon={<Info />} />
        <Disclosure.Title>{t('common:company.engagements_heading')}</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <p className="text-dark-secondary mb-16">{t('common:company.engagements_description')}</p>
        {companyName ? (
          <Card className="flex-row mb-16 p-16" data-cy="company-card">
            <Icon className="mr-16" icon={<Building2 />} />
            <div className="flex flex-col items-start gap-1">
              <p className="text-base font-bold">{companyName}</p>
              {onShowBusinessDescription ? (
                <Button
                  size="sm"
                  className="mt-16"
                  onClick={onShowBusinessDescription}
                  data-cy="show-business-description"
                >
                  {t('common:company.show_more')}
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}
        {pbiNotice ? <p className="text-dark-secondary mb-16">{pbiNotice}</p> : null}
        <Table dense background data-cy="company-engagements">
          <Table.Header>
            <Table.HeaderColumn>{t('common:company.role')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.name')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.identity')}</Table.HeaderColumn>
            {pbiMarking ? <Table.HeaderColumn>{t('common:company.pbi.column')}</Table.HeaderColumn> : null}
          </Table.Header>
          <Table.Body>
            {engagements.map((engagement) => (
              <Table.Row key={`${engagement.identity?.code}-${engagement.name}`}>
                <Table.Column>{engagementRoles(engagement)}</Table.Column>
                <Table.Column>{engagement.name}</Table.Column>
                <Table.Column>{engagement.identity?.code}</Table.Column>
                {pbiMarking ? (
                  <Table.Column>
                    <SupportErrandPbiCell engagement={engagement} marking={pbiMarking} />
                  </Table.Column>
                ) : null}
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Disclosure.Content>
    </Disclosure>
  );
};
