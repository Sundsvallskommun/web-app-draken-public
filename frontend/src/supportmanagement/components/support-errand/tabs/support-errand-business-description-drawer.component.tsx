import { DetailPanelWrapper } from '@common/components/detail-panel-wrapper/detail-panel-wrapper.component';
import {
  companyAccountingPeriod,
  companyAddressLines,
  companyDescriptionParagraphs,
  CompanyProfile,
} from '@common/services/legal-entity-service';
import { Table } from '@sk-web-gui/react';
import { useTranslation } from 'react-i18next';

export const SupportErrandBusinessDescriptionDrawer: React.FC<{
  show: boolean;
  profile: CompanyProfile;
  onClose: () => void;
}> = ({ show, profile, onClose }) => {
  const { t } = useTranslation();
  const paragraphs = companyDescriptionParagraphs(profile);

  return (
    <DetailPanelWrapper
      show={show}
      label={t('common:company.description_heading')}
      closeAriaLabel={t('common:company.close_description')}
      closeHandler={onClose}
      icon="file-text"
      dataCy="business-description"
    >
      <div className="px-40 py-32 flex flex-col gap-20">
        <h2 className="text-h2-md">{t('common:company.description_heading')}</h2>
        <p>
          <strong>{t('common:company.accounting_period')}:</strong> {companyAccountingPeriod(profile)}
        </p>
        <Table background>
          <Table.Header>
            <Table.HeaderColumn>{t('common:company.table_company')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.table_address')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('common:company.table_employees')}</Table.HeaderColumn>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Column className="flex flex-col items-start">
                <span className="font-bold">{profile.name}</span>
                <span>{profile.form}</span>
              </Table.Column>
              <Table.Column className="flex flex-col items-start">
                {companyAddressLines(profile).map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </Table.Column>
              <Table.Column>{profile.employeeSize?.name}</Table.Column>
            </Table.Row>
          </Table.Body>
        </Table>
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p>{t('common:company.no_description')}</p>
        )}
      </div>
    </DetailPanelWrapper>
  );
};
