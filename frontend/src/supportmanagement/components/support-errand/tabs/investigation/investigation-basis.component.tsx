'use client';

import { PdfPreview } from '@common/components/template-preview/pdf-preview.component';
import type { Investigation } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, Icon } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  collectInvestigationBasisParameters,
  INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER,
  investigationBasisHandlerName,
  renderInvestigationBasisPreview,
} from '@supportmanagement/services/support-investigation-basis-service';
import dayjs from 'dayjs';
import { FileText, RefreshCw } from 'lucide-react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const reasonOf = (failure: unknown): string => {
  const message = (failure as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message && message !== 'Internal server error' ? message : '';
};

interface InvestigationBasisProps {
  investigation: Investigation;
  unsaved: boolean;
}

export const InvestigationBasis: FC<InvestigationBasisProps> = ({ investigation, unsaved }) => {
  const { t } = useTranslation();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const attachments = useSupportStore((s) => s.supportAttachments);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const administrators = useUserStore((s) => s.administrators);

  const [pdf, setPdf] = useState('');
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reason, setReason] = useState('');

  const readTheFacts = () =>
    collectInvestigationBasisParameters({
      errand: supportErrand,
      municipalityId,
      metadata: supportMetadata,
      attachments: attachments ?? [],
      investigation,
      handlerName: investigationBasisHandlerName(
        administrators.find((administrator) => administrator.adAccount === supportErrand?.assignedUserId)
      ),
      today: dayjs().format('YYYY-MM-DD'),
      translate: t,
    });

  const render = async () => {
    setRendering(true);
    setFailed(false);
    try {
      setPdf(await renderInvestigationBasisPreview(await readTheFacts()));
    } catch (failure) {
      setFailed(true);
      setReason(reasonOf(failure));
    } finally {
      setRendering(false);
    }
  };

  const buttonIcon = pdf ? <RefreshCw /> : <FileText />;

  const buttonLabel = pdf
    ? t('common:investigation.decision_basis.update')
    : t('common:investigation.decision_basis.button_label');

  const pdfError = failed
    ? [t('common:investigation.decision_basis.error', { template: INVESTIGATION_BASIS_TEMPLATE_IDENTIFIER }), reason]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="border-1 rounded-groups p-16 flex flex-col gap-16 mb-16" data-cy="investigation-basis">
      <div className="flex items-center gap-8">
        <Icon icon={<FileText />} />
        <p className="sk-disclosure-header-title-md">{t('common:investigation.decision_basis.label')}</p>
      </div>
      <p className="m-0">{t('common:investigation.decision_basis.description')}</p>

      <div className="flex items-center gap-16 flex-wrap">
        <Button
          loading={rendering}
          loadingText={t('common:investigation.decision_basis.rendering')}
          disabled={unsaved || rendering}
          onClick={render}
          data-cy="investigation-basis-render"
          leftIcon={buttonIcon}
          color="vattjom"
        >
          {buttonLabel}
        </Button>
        {unsaved ? (
          <p className="text-small text-dark-secondary m-0">{t('common:investigation.decision_basis.unsaved')}</p>
        ) : null}
      </div>

      <PdfPreview
        pdfBase64={pdf}
        isLoading={rendering}
        error={pdfError}
        title={t('common:investigation.decision_basis.preview_title')}
        dataCy="investigation-basis-preview"
      />
    </div>
  );
};
