import { UtredningFormModel } from '@casedata/components/errand/sidebar/sidebar-utredning.component';
import { DecisionFormModel } from '@casedata/components/errand/tabs/decision/casedata-decision-tab';
import { Service } from '@casedata/components/errand/tabs/services/casedata-service-mapper';
import { Attachment } from '@casedata/interfaces/attachment';
import { getLabelFromCaseType } from '@casedata/interfaces/case-label';
import { Decision, DecisionOutcome, DecisionType } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import { Law } from '@common/data-contracts/case-data/data-contracts';
import { Render, Template, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import { TemplateApiResponse } from '@supportmanagement/services/message-template-service';
import dayjs from 'dayjs';

import { isFTErrand, isFTNationalErrand } from './casedata-errand-service';
import { getOwnerStakeholder } from './casedata-stakeholder-service';

export const lawMapping: Law[] = [
  {
    heading: '13 kap. 8 § trafikförordningen',
    sfs: 'Trafikförordningen (1998:1276)',
    chapter: '13',
    article: '8',
  },
  {
    heading: '20§ förvaltningslagen',
    sfs: 'Förvaltningslagen (2017:900)',
    chapter: '',
    article: '20',
  },
];

const lawMappingFT: Law[] = [
  { heading: '1§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '1' },
  { heading: '5§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '5' },
  { heading: '6§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '6' },
  { heading: '7§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '7' },
  { heading: '8§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '8' },
  { heading: '9§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '9' },
  { heading: '10§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '10' },
  { heading: '12§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '12' },
  { heading: '13§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '13' },
  { heading: '16§ - Lag om färdtjänst', sfs: 'Lag (1997:736)', chapter: '', article: '16' },
];

export const getLawMapping = (errand: IErrand): Law[] => {
  if (isPT()) {
    const baseLawMapping = isFTErrand(errand) ? lawMappingFT : lawMapping;

    const existingLaws =
      errand.decisions
        ?.flatMap((d) => d.law || [])
        .filter(
          (existingLaw) => existingLaw.heading && !baseLawMapping.some((l) => l.heading === existingLaw.heading)
        ) || [];

    const uniqueExistingLaws = existingLaws.filter(
      (law, index, self) => index === self.findIndex((l) => l.heading === law.heading)
    );

    return [...baseLawMapping, ...uniqueExistingLaws];
  }

  return [
    {
      heading: '',
      sfs: '',
      chapter: '',
      article: '',
    },
  ];
};

export const LOST_PERMIT_STANDARD_DECISION_TEXT =
  '<p>Inget formellt beslut fattas för borttappade kort, beslutet om att bevilja parkeringstillstånd har tagits i ärendet för den ursprungliga ansökan.</p>';

export const fetchDecisionTemplates: (prefix: string, decision?: string) => Promise<Template[]> = (prefix, decision) => {
  const params = new URLSearchParams({ templateType: 'Decision', prefix });
  if (decision) {
    params.append('decision', decision);
  }
  return apiService
    .get<ApiResponse<Template[]>>(`templates?${params.toString()}`)
    .then((res) => res.data.data)
    .catch(() => {
      throw new Error('Kunde inte hämta beslutsmallar');
    });
};

export const renderTemplatePdf: (
  identifier: string,
  parameters: { [key: string]: string | Object }
) => Promise<string> = (identifier, parameters) => {
  const body: TemplateSelector = { identifier, parameters };
  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render/pdf', body)
    .then((res) => res.data.data.output)
    .catch(() => {
      throw new Error('Något gick fel när förhandsgranskningen skulle skapas');
    });
};

export const saveDecision: (
  municipalityId: string,
  errand: IErrand,
  formData: UtredningFormModel | DecisionFormModel,
  decisionType: DecisionType,
  pdf?: string
) => Promise<boolean> = (municipalityId, errand, formData, decisionType, pdf) => {
  const atts = [];
  if (pdf) {
    const att: Attachment = {
      category: 'BESLUT',
      name: `beslut-arende-${errand.errandNumber}`,
      note: '',
      extension: 'pdf',
      mimeType: 'application/pdf',
      file: pdf,
    };
    atts.push(att);
  }
  const { adAccount, addresses, contactInformation, extraParameters, firstName, lastName, roles, type } =
    errand.administrator;
  const decidedBy: CreateStakeholderDto = {
    adAccount,
    addresses,
    contactInformation,
    extraParameters,
    firstName,
    lastName,
    roles,
    type,
  };

  const obj: Decision = {
    ...(formData.id && { id: parseInt(formData.id, 10) }),
    decisionType,
    decisionOutcome: formData.outcome as DecisionOutcome,
    description: formData.description,
    law: formData.law,
    validFrom: isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validFrom).startOf('day').toISOString() : '',
    validTo: isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validTo).endOf('day').toISOString() : '',
    decidedAt: dayjs().toISOString(),
    decidedBy: decidedBy,
    attachments: atts,
    ...(formData.extraParameters && { extraParameters: formData.extraParameters }),
  };
  const apiCall = obj.id
    ? apiService.put<boolean, Decision>(`${municipalityId}/errands/${errand.id}/decisions/${obj.id}`, obj)
    : apiService.patch<boolean, Decision>(`${municipalityId}/errands/${errand.id}/decisions`, obj);
  return apiCall
    .then((res) => {
      return true;
    })
    .catch((e) => {
      throw new Error('Något gick fel när informationen skulle sparas');
    });
};

export const getProposedDecisonWithHighestId: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.filter((d) => d.decisionType === 'PROPOSED').sort((a, b) => (b.id ?? 0) - (a.id ?? 0))?.[0];

export const getFinalDecisonWithHighestId: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.filter((d) => d.decisionType === 'FINAL').sort((a, b) => (b.id ?? 0) - (a.id ?? 0))?.[0];

export const getTopmostDecision: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.find((d) => d.decisionType === 'FINAL') ||
  ds.find((d) => d.decisionType === 'PROPOSED') ||
  ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getFinalOrProposedDecision: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.find((d) => d.decisionType === 'FINAL') || ds.find((d) => d.decisionType === 'PROPOSED');

export const getProposedOrRecommendedDecision: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.find((d) => d.decisionType === 'PROPOSED') || ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getRecommendedDecision: (ds: Decision[]) => Decision | undefined = (ds) =>
  ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getDecisionLabel: (outcome: DecisionOutcome) => string = (outcome) => {
  if (!outcome) {
    return '';
  }
  switch (outcome) {
    case 'APPROVAL':
      return 'Bifall';
    case 'REJECTION':
      return 'Avslag';
    case 'CANCELLATION':
      return 'Ärendet avskrivs';
    case 'DISMISSAL':
      return 'Ärendet avvisas';
    default:
      return 'Okänt utfall';
  }
};

export const getUtredningPhrases: (errand: IErrand, outcome: DecisionOutcome) => Promise<{ phrases: string }> = (
  errand,
  outcome
) => getPhrases(errand, outcome, 'investigation');

export const getDecisionPhrases: (errand: IErrand, outcome: DecisionOutcome) => Promise<{ phrases: string }> = (
  errand,
  outcome
) => getPhrases(errand, outcome, 'decision');

export const getPhrases: (
  errand: IErrand,
  outcome: DecisionOutcome,
  templateType: 'investigation' | 'decision'
) => Promise<{ phrases: string }> = (errand, outcome, templateType) => {
  const extraParametersCapacity = errand.extraParameters?.find(
    (parameter) => parameter.key === 'application.applicant.capacity'
  )?.values?.[0];
  const capacity =
    outcome === 'CANCELLATION'
      ? 'all'
      : extraParametersCapacity === 'DRIVER'
      ? 'driver'
      : extraParametersCapacity === 'PASSENGER'
      ? 'passenger'
      : undefined;
  if (!capacity) {
    return Promise.resolve({ phrases: '' });
  }
  const identifier = `sbk.rph.${templateType}.phrases.${capacity}.${outcome.toLowerCase()}`;
  const selector: TemplateSelector = {
    identifier: identifier,
    parameters: {
      walkingDistance:
        errand.extraParameters.find((p) => p.key === 'disability.walkingDistance.max')?.values?.[0] ?? 'NNN',
      disabilityAid:
        errand.extraParameters.find((p) => p.key === 'disability.aid')?.values?.[0].toLocaleLowerCase() ?? '(saknas)',
      disabilityReason: errand.extraParameters.find((p) => p.key === 'application.reason')?.values?.[0] ?? '(saknas)',
    },
  };
  return apiService
    .post<ApiResponse<{ content: string }>, TemplateSelector>('templates/phrases', selector)
    .then((res) => {
      const phrases = base64Decode(res.data.data.content);
      return { phrases };
    })
    .catch((e) => {
      return { phrases: '', error: e.response?.status ?? 'UNKNOWN ERROR' } as {
        phrases: string;
        error?: string;
      };
    });
};

export const fetchInvestigationSkeleton: (errand: IErrand) => Promise<string> = async (errand) => {
  const identifier = isFTNationalErrand(errand) ? 'sbk.rft.investigation.skeleton' : 'sbk.ft.investigation.skeleton';
  try {
    const response = await apiService.get<ApiResponse<TemplateApiResponse>>(`templates/${identifier}`);
    const template = response.data?.data;
    if (template?.content) {
      return base64Decode(template.content);
    }
    return '';
  } catch (error) {
    console.error(`Failed to fetch investigation skeleton: ${identifier}`, error);
    return '';
  }
};

export const mapServicesToTemplateParams = (services: Service[]): Record<string, string>[] => {
  return services.map((service) => {
    const item: Record<string, string> = {
      restyp: service.restyp + (service.isWinterService ? ' (Vinterfärdtjänst)' : ''),
      validFrom: service.startDate ? dayjs(service.startDate).format('YYYY-MM-DD') : '',
      validTo: service.endDate ? dayjs(service.endDate).format('YYYY-MM-DD') : '',
      validityType: service.validityType || '',
    };
    if (service.transportMode?.length > 0) {
      item.transportMode = service.transportMode.join(', ');
    }
    if (service.aids?.length > 0) {
      item.aids = service.aids.join(', ');
    }
    if (service.addon?.length > 0) {
      item.addon = service.addon.join(', ');
    }
    return item;
  });
};

export const renderUtredningPdf: (
  errand: IErrand,
  d: UtredningFormModel | DecisionFormModel,
  services?: Service[]
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, d, services) => {
  return renderPdf(errand, d, 'investigation', services);
};

export const renderBeslutPdf: (
  errand: IErrand,
  d: UtredningFormModel | DecisionFormModel,
  services?: Service[]
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, d, services) => {
  return renderPdf(errand, d, 'decision', services);
};

export const renderPdf: (
  errand: IErrand,
  formData: UtredningFormModel | DecisionFormModel,
  templateType: 'investigation' | 'decision',
  services?: Service[]
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, formData, templateType, services) => {
  const decision = errand.decisions.find(
    (d) =>
      (templateType === 'decision' && d.decisionType === 'FINAL') ||
      (templateType === 'investigation' && d.decisionType === 'PROPOSED')
  );
  if (!decision) {
    console.error('No saved decision found. Rendering preview for current form values.');
  }
  const outcome =
    formData.outcome === 'APPROVAL'
      ? 'approval'
      : formData.outcome === 'REJECTION'
      ? 'rejection'
      : formData.outcome === 'CANCELLATION'
      ? 'cancellation'
      : '';

  let identifier = `mex.decision`;
  let capacity = '';

  if (isMEX()) {
    identifier = `mex.decision`;
  } else if (isPT() && isFTNationalErrand(errand)) {
    identifier = templateType === 'investigation' ? 'sbk.rft.investigation' : `sbk.rft.decision.${outcome}`;
  } else if (isPT() && isFTErrand(errand)) {
    identifier = templateType === 'investigation' ? 'sbk.ft.investigation' : `sbk.ft.decision.${outcome}`;
  } else if (isPT()) {
    const extraParametersCapacity = errand.extraParameters?.find(
      (parameter) => parameter.key === 'application.applicant.capacity'
    )?.values?.[0];
    capacity =
      outcome === 'cancellation'
        ? 'all'
        : extraParametersCapacity === 'DRIVER'
        ? 'driver'
        : extraParametersCapacity === 'PASSENGER'
        ? 'passenger'
        : // TODO Default to driver if capacity is missing?
          'driver';

    identifier = `sbk.rph.${outcome === 'cancellation' ? 'decision' : templateType}.${capacity}.${outcome}`;
  }

  const owner = getOwnerStakeholder(errand);
  const wrapWithWordBreak = (html: string) =>
    `<div style="overflow-wrap: break-word; word-break: break-word;">${html}</div>`;

  const parameters: { [key: string]: any } = {
    caseNumber: formData.errandNumber ?? '',
    caseType: getLabelFromCaseType(formData.errandCaseType),
    personalNumber: formData.personalNumber ?? '',
    addressLastname: owner?.lastName,
    addressFirstname: owner?.firstName,
    addressCo: owner?.careof,
    addressLine1: owner?.street,
    addressLine2: [owner?.zip, owner?.city].join(' '),
    administratorName: errand.administrator
      ? `${errand.administrator?.firstName} ${errand.administrator?.lastName}`
      : '',
    description: wrapWithWordBreak(formData.description),
  };

  if (templateType === 'investigation') {
    parameters['investigationText'] = wrapWithWordBreak(formData.description);
    parameters['investigationDate'] = dayjs(decision?.updated).format('YYYY-MM-DD');
    parameters['permitFirstname'] = owner?.firstName;
    parameters['permitLastname'] = owner?.lastName;
    parameters['creationDate'] = dayjs(decision?.created).format('YYYY-MM-DD');
    parameters['disabilityReason'] = errand.extraParameters.find((p) => p.key === 'application.reason')?.values?.[0] ?? '';
  } else if (templateType === 'decision') {
    parameters['decisionText'] = wrapWithWordBreak(formData.description);
    parameters['decisionDate'] = dayjs(decision?.decidedAt).format('YYYY-MM-DD');
    if (outcome === 'approval') {
      parameters['permitFirstname'] = owner?.firstName;
      parameters['permitLastname'] = owner?.lastName;
      parameters['permitEndDate'] = dayjs(formData.validTo).format('YYYY-MM-DD');
    }
  }
  if (outcome === 'cancellation') {
    parameters['creationDate'] = dayjs(decision?.created).format('YYYY-MM-DD');
  }

  if (isPT() && isFTErrand(errand)) {
    const lawsBySfs = (formData.law as Law[])?.reduce((acc, law) => {
      if (law.article && law.sfs) {
        if (!acc[law.sfs]) {
          acc[law.sfs] = [];
        }
        acc[law.sfs].push(law.article);
      }
      return acc;
    }, {} as Record<string, string[]>);

    const lawReferences = lawsBySfs
      ? Object.entries(lawsBySfs)
          .map(([sfs, articles]) => {
            return `${articles.join('§, ')}§ (${sfs})`;
          })
          .join(', ')
      : '';

    parameters['lawReferences'] = lawReferences;
    parameters['services'] = services && services.length > 0
      ? mapServicesToTemplateParams(services)
      : [];
  }

  const renderBody: TemplateSelector = { identifier, parameters };

  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render/pdf', renderBody)
    .then((res) => {
      const pdfBase64 = res.data.data.output;
      return { pdfBase64 };
    })
    .catch((e) => {
      throw new Error('Något gick fel när förhandsgranskningen skulle skapas');
    });
};

export const renderHtml: (
  errand: IErrand,
  formData: UtredningFormModel | DecisionFormModel,
  templateType: 'investigation' | 'decision'
) => Promise<{ htmlBase64: string; error?: string }> = async (errand, formData, templateType) => {
  const decision = errand.decisions.find(
    (d) =>
      (templateType === 'decision' && d.decisionType === 'FINAL') ||
      (templateType === 'investigation' && d.decisionType === 'PROPOSED')
  );
  if (!decision) {
    console.error('No saved decision found. Rendering preview for current form values.');
  }
  const identifier = `mex.decision`;
  const renderBody: TemplateSelector = {
    identifier: identifier,
    parameters: {
      caseNumber: formData.errandNumber ?? '',
      administratorName: errand.administrator
        ? `${errand.administrator?.firstName} ${errand.administrator?.lastName}`
        : '',
      description: `<div style="overflow-wrap: break-word; word-break: break-word;">${formData.description.replace(/<p>/g, '<p style="margin: 0;">')}</div>`,
      decisionDate: dayjs(decision?.updated).format('YYYY-MM-DD'),
    },
  };
  return apiService
    .post<ApiResponse<Render>, TemplateSelector>('render', renderBody)
    .then((res) => {
      const htmlBase64 = res.data.data.output;
      return { htmlBase64 };
    })
    .catch((e) => {
      throw new Error('Något gick fel när mallen skulle renderas');
    });
};

export const fetchDecision: (id: string) => Promise<ApiResponse<Decision>> = (id) => {
  if (!id) {
    console.error('No decision id found, cannot fetch. Returning.');
  }
  const url = `decisions/${id}`;
  return apiService
    .get<ApiResponse<Decision>>(url)
    .then((res) => res.data)
    .catch((e) => {
      console.error('Something went wrong when fetching attachment: ', id);
      throw e;
    });
};
