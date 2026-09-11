import { CompanyEngagement, engagementRoles } from '@common/services/legal-entity-service';
import { Disclosure, Table } from '@sk-web-gui/react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const SupportErrandCompanyEngagements: React.FC<{
  engagements: CompanyEngagement[];
  initiallyOpen: boolean;
}> = ({ engagements, initiallyOpen }) => {
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
        <Table dense background data-cy="company-engagements">
          <Table.Header>
            <Table.HeaderColumn>{t('common:company.role')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.name')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.identity')}</Table.HeaderColumn>
          </Table.Header>
          <Table.Body>
            {engagements.map((engagement) => (
              <Table.Row key={`${engagement.identity?.code}-${engagement.name}`}>
                <Table.Column>{engagementRoles(engagement)}</Table.Column>
                <Table.Column>{engagement.name}</Table.Column>
                <Table.Column>{engagement.identity?.code}</Table.Column>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Disclosure.Content>
    </Disclosure>
  );
};
