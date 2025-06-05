import { MEXCaseLabel } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import { getExtraParametersLabels } from '@casedata/services/casedata-extra-parameters-service';
import { Render } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';

const renderPdf = (url, data, exportParameters) =>
  apiService
    .post<ApiResponse<Render>, (IErrand & { caseLabel: string })[]>(url, data, exportParameters)
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
  exportParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (municipalityId, errandsData: IErrand[], exportParameters) => {
  let url = `${municipalityId}/export`;
  if (exportParameters?.length) {
    url += `?exclude=${exportParameters.join(',')}`;
  }

  const preparedErrands = errandsData.map((errand) => ({
    ...errand,
    caseLabel: MEXCaseLabel[errand.caseType],
  }));

  return renderPdf(url, preparedErrands, exportParameters);
};

export const exportSingleErrand: (
  municipalityId: string,
  errand: IErrand,
  exportParameters?: string[]
) => Promise<{ pdfBase64: string; error?: string }> = (municipalityId, errand: IErrand, exportParameters) => {
  let url = `${municipalityId}/exportsingle`;
  if (exportParameters?.length) {
    url += `?exclude=${exportParameters.join(',')}`;
  }

  const preparedErrand = {
    ...errand,
    caseLabel: MEXCaseLabel[errand.caseType],
    extraParameters: errand.extraParameters?.map((ep) => ({
      ...ep,
      label: getExtraParametersLabels(errand.caseType)?.[ep.key] || '',
    })),
  };

  return renderPdf(url, preparedErrand, exportParameters);
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
