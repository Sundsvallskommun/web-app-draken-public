import { getLabelFromCaseType } from '@casedata/interfaces/case-label';
import { IErrand } from '@casedata/interfaces/errand';
import {
  extraParametersToUppgiftMapper,
  getExtraParametersLabels,
  getUppgiftDisplayValues,
} from '@casedata/services/casedata-extra-parameters-service';
import { renderPdf } from '@common/services/export-service';
import { appConfig } from '@config/appconfig';

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
    caseLabel: getLabelFromCaseType(errand.caseType),
  }));

  return renderPdf(url, { applicationName: appConfig.applicationName, errands: preparedErrands }, includeParameters);
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
    applicationName: appConfig.applicationName,
    attachments: errand.attachments.map((attachment) => ({
      name: attachment.name,
      mimeType: attachment.mimeType,
      file: '',
    })),
    caseLabel: getLabelFromCaseType(errand.caseType),
    extraParameters: mappedParams
      .filter((ep): ep is NonNullable<typeof ep> => ep != null)
      .map((ep) => ({
        id: ep.field,
        key: ep.field,
        displayName: ep.label,
        values: getUppgiftDisplayValues(ep),
        label: getExtraParametersLabels(errand.caseType, errand.channel)?.[ep.field] || '',
      })),
  };

  return renderPdf(url, preparedErrand, includeParameters);
};
