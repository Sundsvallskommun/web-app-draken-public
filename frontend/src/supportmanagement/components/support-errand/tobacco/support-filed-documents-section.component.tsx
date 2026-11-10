'use client';

import { useSupportStore } from '@stores/index';
import {
  type Sections,
  supportInvestigationTextKeys,
} from '@supportmanagement/services/support-investigation-sections';
import { supportFiledDocuments } from '@supportmanagement/services/support-tobacco-application-service';
import { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationFact } from '../investigation-fact.component';
import { type InvestigationSectionProps, InvestigationSectionText } from '../investigation-section-text.component';

interface FiledDocumentsProps extends InvestigationSectionProps {
  sectionKey: Sections;
  purposes: readonly string[];
  factKey: string;
}

export const SupportFiledDocumentsSection: FC<FiledDocumentsProps> = ({ sectionKey, purposes, factKey, ...props }) => {
  const { t } = useTranslation();
  const attachments = useSupportStore((s) => s.supportAttachments);

  const documents = useMemo(() => supportFiledDocuments(attachments, purposes), [attachments, purposes]);

  return (
    <div className="flex flex-col gap-24" data-cy={`filed-documents-${sectionKey}`}>
      <InvestigationFact label={t(factKey)}>
        {documents.length === 0 ? (
          <span className="text-dark-secondary" data-cy={`filed-documents-${sectionKey}-none`}>
            {t('common:investigation.filed_documents_none')}
          </span>
        ) : (
          <ul className="m-0 pl-0 list-none flex flex-col gap-2" data-cy={`filed-documents-${sectionKey}-list`}>
            {documents.map((document) => (
              <li key={document.id}>{[document.purpose, document.fileName].filter(Boolean).join(': ')}</li>
            ))}
          </ul>
        )}
      </InvestigationFact>

      <InvestigationSectionText {...props} name={sectionKey} {...supportInvestigationTextKeys(sectionKey)} />
    </div>
  );
};
