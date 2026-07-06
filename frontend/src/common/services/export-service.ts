import { MEXCaseLabel } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import {
  extraParametersToUppgiftMapper,
  getExtraParametersLabels,
} from '@casedata/services/casedata-extra-parameters-service';
import { Render } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';

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

const renderPdf = (url: string, data: any, includeParameters?: string[]) =>
  apiService
    .post<ApiResponse<Render>, (IErrand & { caseLabel: string })[]>(url, data, includeParameters)
    .then((res) => {
      const pdfBase64 = res.data.data.output;

      return { pdfBase64 };
    })
    .catch((e) => {
      throw new Error('Något gick fel när ärendelistan skulle exporteras');
    });

export const exportErrands: (
  municipalityId: string,
  errandsData: IErrand[],
  includeParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (municipalityId, errandsData: IErrand[], includeParameters) => {
  let url = `${municipalityId}/export`;
  if (includeParameters?.length) {
    url += `?include=${includeParameters.join(',')}`;
  }

  const preparedErrands = errandsData.map((errand) => ({
    ...errand,
    attachments: errand.attachments.map((attachment) => ({
      name: attachment.name,
      mimeType: attachment.mimeType,
      file: '',
    })),
    caseLabel: (MEXCaseLabel as Record<string, string>)[errand.caseType],
  }));

  return renderPdf(url, preparedErrands, includeParameters);
};

export const exportSingleErrand: (
  municipalityId: string,
  errand: IErrand,
  includeParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (municipalityId, errand: IErrand, includeParameters) => {
  let url = `${municipalityId}/exportsingle`;
  if (includeParameters?.length) {
    url += `?include=${includeParameters.join(',')}`;
  }

  const mappedParams = extraParametersToUppgiftMapper(errand);

  const preparedErrand = {
    ...errand,
    attachments: errand.attachments.map((attachment) => ({
      name: attachment.name,
      mimeType: attachment.mimeType,
      file: '',
    })),
    caseLabel: (MEXCaseLabel as Record<string, string>)[errand.caseType],
    extraParameters: mappedParams
      .filter((ep): ep is NonNullable<typeof ep> => ep != null)
      .map((ep) => ({
        id: ep.field,
        key: ep.field,
        displayName: ep.label,
        values: Array.isArray(ep.value) ? ep.value : [ep.value],
        label: getExtraParametersLabels(errand.caseType, errand.channel)?.[ep.field] || '',
      })),
  };

  return renderPdf(url, preparedErrand, includeParameters);
};

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

const downloadFile = (name: string, url: string) => {
  const link = document.createElement('a');
  link.setAttribute('download', name);
  link.href = url;
  link.setAttribute('target', '_blank');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadPdf = (
  d: { pdfBase64: string; error?: string },
  name: string,
  successHandler: () => void,
  errorHandler: () => void
) => {
  if (typeof d.error === 'undefined' && typeof d.pdfBase64 !== 'undefined') {
    const byteCharacters = atob(d.pdfBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    downloadFile(name, url);
    URL.revokeObjectURL(url);
    successHandler();
  } else {
    errorHandler();
  }
};

export const downloadAttachment = (attachment: { mimeType: string; file: string; name: string }, errand: IErrand) => {
  const uri = `data:${attachment.mimeType};base64,${attachment.file}`;
  const filename = attachment.name;
  downloadFile(filename, uri);
};
