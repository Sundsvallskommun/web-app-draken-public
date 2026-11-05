import type { ErrandAttachment, InvestigationSection } from '@common/data-contracts/supportmanagement/data-contracts';
import { sanitized } from '@common/services/sanitizer-service';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportAttachment } from '@supportmanagement/services/support-attachment-service';
import {
  getSupportInvestigation,
  isSupportInvestigationCompleted,
  SupportInvestigation,
} from '@supportmanagement/services/support-investigation-service';
import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { asInvestigationDate, InvestigationMetaItem } from './investigation-meta.component';

const sectionsInOrder = (investigation: SupportInvestigation | undefined): InvestigationSection[] =>
  [...(investigation?.sections ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

const hasSomethingToShow = (section: InvestigationSection): boolean =>
  !!section.text?.trim() || !!section.assessment?.trim();

const WrittenText: FC<{ html: string }> = ({ html }) => (
  <div className="[&>p]:m-0 [&>p]:mb-8" dangerouslySetInnerHTML={{ __html: sanitized(html) }} />
);

const WrittenPart: FC<{ heading: string; html: string | undefined }> = ({ heading, html }) =>
  html?.trim() ? (
    <div className="flex flex-col gap-8">
      <h3 className="text-h4-md m-0">{heading}</h3>
      <WrittenText html={html} />
    </div>
  ) : null;

export const MigratedInvestigation: FC<{ setHasContent: (hasContent: boolean) => void }> = ({ setHasContent }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const errandId = useSupportStore((s) => s.supportErrand?.id);

  const [investigation, setInvestigation] = useState<SupportInvestigation>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!errandId) return undefined;
    let current = true;
    getSupportInvestigation(errandId, municipalityId)
      .then((result) => {
        if (!current) return;
        setInvestigation(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (!current) return;
        setError(true);
        setIsLoading(false);
      });
    return () => {
      current = false;
    };
  }, [errandId, municipalityId]);

  useEffect(() => {
    setHasContent(Boolean(investigation));
  }, [investigation, setHasContent]);

  const open = async (attachment: ErrandAttachment) => {
    if (!attachment.id || !errandId) return;

    try {
      const file = await getSupportAttachment(errandId, municipalityId, {
        id: attachment.id,
        fileName: attachment.fileName ?? '',
        mimeType: attachment.mimeType ?? '',
      });
      const link = document.createElement('a');
      link.href = `data:${attachment.mimeType};base64,${file.base64EncodedString}`;
      link.setAttribute('download', attachment.fileName ?? '');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toastMessage({
        position: 'bottom',
        closeable: false,
        message: t('common:investigation.migrated.open_failed'),
        status: 'error',
      });
    }
  };

  const sections = sectionsInOrder(investigation);
  const attachments = investigation?.attachments ?? [];

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col gap-24" data-cy="migrated-investigation">
      <div>
        <h2 className="text-h2-md mb-8">{t('common:investigation.heading')}</h2>
        <p className="m-0">{t('common:investigation.migrated.intro')}</p>
      </div>

      {isLoading ? <Spinner size={3} aria-label={t('common:investigation.loading')} /> : null}
      {error ? <p className="m-0">{t('common:investigation.error')}</p> : null}

      {!isLoading && !error && !investigation ? <p className="m-0">{t('common:investigation.migrated.none')}</p> : null}

      {!isLoading && !error && investigation ? (
        <div className="flex flex-col gap-24">
          <div className="flex flex-wrap gap-40">
            <InvestigationMetaItem
              label={t('common:investigation.migrated.title')}
              value={investigation.title ?? '-'}
            />
            <InvestigationMetaItem
              label={t('common:investigation.started_at')}
              value={asInvestigationDate(investigation.startedAt)}
            />
            {isSupportInvestigationCompleted(investigation) ? (
              <InvestigationMetaItem
                label={t('common:investigation.status_completed')}
                value={asInvestigationDate(investigation.completedAt)}
              />
            ) : null}
          </div>

          <WrittenPart heading={t('common:investigation.migrated.description')} html={investigation.description} />
          <WrittenPart heading={t('common:investigation.migrated.summary')} html={investigation.summary} />
          <WrittenPart heading={t('common:investigation.migrated.conclusion')} html={investigation.conclusion} />

          {sections.filter(hasSomethingToShow).map((section) => (
            <div key={section.id ?? section.sectionKey} className="flex flex-col gap-8">
              <h3 className="text-h4-md m-0">{section.heading ?? section.sectionKey}</h3>
              {section.text?.trim() ? <WrittenText html={section.text} /> : null}
              {section.assessment?.trim() ? (
                <p className="m-0 text-small text-dark-secondary">{section.assessment}</p>
              ) : null}
            </div>
          ))}

          <div className="flex flex-col gap-8">
            <h3 className="text-h4-md m-0">{t('common:investigation.migrated.files')}</h3>
            {attachments.length === 0 ? (
              <p className="m-0">{t('common:investigation.migrated.files_none')}</p>
            ) : (
              <ul className="list-none p-0 m-0 flex flex-col gap-4">
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <Button variant="link" size="sm" onClick={() => open(attachment)} data-cy="migrated-file">
                      {attachment.fileName}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
