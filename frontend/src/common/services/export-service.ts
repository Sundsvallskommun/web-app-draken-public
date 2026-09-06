import { Render } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';

export const renderPdf = <T>(url: string, data: T, includeParameters?: string[]) =>
  apiService
    .post<ApiResponse<Render>, T>(url, data, includeParameters)
    .then((res) => {
      const pdfBase64 = res.data.data.output;

      return { pdfBase64 };
    })
    .catch((e) => {
      throw new Error('Något gick fel när ärendelistan skulle exporteras');
    });

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

export const downloadAttachment = (attachment: { mimeType: string; file: string; name: string }) => {
  const uri = `data:${attachment.mimeType};base64,${attachment.file}`;
  const filename = attachment.name;
  downloadFile(filename, uri);
};
