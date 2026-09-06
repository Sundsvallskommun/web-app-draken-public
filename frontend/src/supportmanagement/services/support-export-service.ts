import { renderPdf } from '@common/services/export-service';

import type { SupportErrand } from './support-errand-service';

interface SupportExportOptions {
  applicationName?: string;
  attachments: { fileName: string; mimeType: string }[];
  caseLabel?: string;
  category?: string;
  subTypeLabel?: string;
  channelLabel?: string;
  statusLabel?: string;
  priorityLabel?: string;
}

export const exportSingleSupportErrand: (
  municipalityId: string,
  errand: SupportErrand,
  options: SupportExportOptions,
  includeParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (municipalityId, errand, options, includeParameters) => {
  let url = `${municipalityId}/exportsinglesupport`;
  if (includeParameters?.length) {
    url += `?include=${includeParameters.join(',')}`;
  }

  const preparedErrand = {
    errandNumber: errand.errandNumber,
    applicationName: options.applicationName,
    status: options.statusLabel ?? errand.status,
    priority: options.priorityLabel ?? errand.priority,
    channel: errand.channel,
    channelLabel: options.channelLabel,
    title: errand.title,
    description: errand.description,
    caseLabel: options.caseLabel,
    category: options.category,
    subTypeLabel: options.subTypeLabel,
    created: errand.created,
    modified: errand.modified,
    customer: errand.customer,
    contacts: errand.contacts,
    parameters: errand.parameters,
    attachments: options.attachments.map((attachment) => ({
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    })),
  };

  return renderPdf(url, preparedErrand, includeParameters);
};
