import { MEXCaseLabel } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import {
  extraParametersToUppgiftMapper,
  getExtraParametersLabels,
} from '@casedata/services/casedata-extra-parameters-service';
import { Render } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';

const renderPdf = (url, data, includeParameters) =>
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
  errandsData: IErrand[],
  includeParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (errandsData: IErrand[], includeParameters) => {
  let url = `/export`;
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
    caseLabel: MEXCaseLabel[errand.caseType],
  }));

  return renderPdf(url, preparedErrands, includeParameters);
};

export const exportSingleErrand: (
  errand: IErrand,
  includeParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (errand: IErrand, includeParameters) => {
  let url = `/exportsingle`;
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
    caseLabel: MEXCaseLabel[errand.caseType],
    extraParameters: mappedParams.map((ep) => ({
      id: ep.field,
      key: ep.field,
      displayName: ep.label,
      values: Array.isArray(ep.value) ? ep.value : [ep.value],
      label: getExtraParametersLabels(errand.caseType)?.[ep.field] || '',
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

export const downloadPdf = (d: { pdfBase64: string; error?: string }, name, successHandler, errorHandler) => {
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

export const downloadAttachment = (attachment, errand) => {
  const uri = `data:${attachment.mimeType};base64,${attachment.file}`;
  const filename = attachment.name;
  downloadFile(filename, uri);
};
