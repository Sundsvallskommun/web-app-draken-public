import { UtredningFormModel } from '@casedata/components/errand/sidebar/sidebar-utredning.component';
import { DecisionFormModel } from '@casedata/components/errand/tabs/decision/casedata-decision-tab';
import { Service } from '@casedata/components/errand/tabs/services/casedata-service-mapper';
import { Attachment } from '@casedata/interfaces/attachment';
import { getLabelFromCaseType } from '@casedata/interfaces/case-label';
import { Decision, DecisionOutcome, DecisionType } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { CreateStakeholderDto } from '@casedata/interfaces/stakeholder';
import { Law } from '@common/data-contracts/case-data/data-contracts';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import dayjs from 'dayjs';
import { isFTErrand, isFTNationalErrand } from './casedata-errand-service';
import { getOwnerStakeholder } from './casedata-stakeholder-service';

export const lawMapping: Law[] = [
  {
    heading: '13 kap. 8§ Parkeringstillstånd för rörelsehindrade',
    sfs: 'Trafikförordningen (1998:1276)',
    chapter: '13',
    article: '8',
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
    return isFTErrand(errand) ? lawMappingFT : lawMapping;
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

export const beslutsmallMapping = [
  {
    id: 1,
    label: 'Förfrågan arrende avslag privatperson',
  },
  {
    id: 2,
    label: 'Förfrågan avskrivs',
  },
  {
    id: 3,
    label: 'Förfrågan mark för småhus, nekande svar',
  },
];

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
    validFrom:
      isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validFrom).startOf('day').toISOString() : undefined,
    validTo: isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validTo).endOf('day').toISOString() : undefined,
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

export const getProposedDecisonWithHighestId: (ds: Decision[]) => Decision = (ds) =>
  ds.filter((d) => d.decisionType === 'PROPOSED').sort((a, b) => b.id - a.id)?.[0];

export const getFinalDecisonWithHighestId: (ds: Decision[]) => Decision = (ds) =>
  ds.filter((d) => d.decisionType === 'FINAL').sort((a, b) => b.id - a.id)?.[0];

export const getTopmostDecision: (ds: Decision[]) => Decision = (ds) =>
  ds.find((d) => d.decisionType === 'FINAL') ||
  ds.find((d) => d.decisionType === 'PROPOSED') ||
  ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getFinalOrProposedDecision: (ds: Decision[]) => Decision = (ds) =>
  ds.find((d) => d.decisionType === 'FINAL') || ds.find((d) => d.decisionType === 'PROPOSED');

export const getProposedOrRecommendedDecision: (ds: Decision[]) => Decision = (ds) =>
  ds.find((d) => d.decisionType === 'PROPOSED') || ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getRecommendedDecision: (ds: Decision[]) => Decision = (ds) =>
  ds.find((d) => d.decisionType === 'RECOMMENDED');

export const getDecisionLabel: (outcome: DecisionOutcome) => string = (outcome) => {
  if (!outcome) {
    return undefined;
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
  const extraParametersCapacity = errand.extraParameters.find(
    (parameter) => parameter.key === 'application.applicant.capacity'
  )?.values[0];
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
      return { phrases: undefined, error: e.response?.status ?? 'UNKNOWN ERROR' } as {
        phrases: string;
        error?: string;
      };
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
    identifier = `sbk.rft.decision.${outcome}`;
  } else if (isPT() && isFTErrand(errand)) {
    identifier = `sbk.ft.decision.${outcome}`;
  } else if (isPT()) {
    const extraParametersCapacity = errand.extraParameters.find(
      (parameter) => parameter.key === 'application.applicant.capacity'
    )?.values[0];
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
  const renderBody: TemplateSelector = {
    identifier: identifier,
    parameters: {
      caseNumber: formData.errandNumber,
      caseType: getLabelFromCaseType(formData.errandCaseType),
      personalNumber: formData.personalNumber,
      addressLastname: owner?.lastName,
      addressFirstname: owner?.firstName,
      addressCo: owner?.careof,
      addressLine1: owner?.street,
      addressLine2: [owner?.zip, owner?.city].join(' '),
      administratorName: errand.administrator
        ? `${errand.administrator?.firstName} ${errand.administrator?.lastName}`
        : '',
    },
  };
  if (templateType === 'investigation') {
    renderBody.parameters['investigationText'] = formData.description;
    renderBody.parameters['investigationDate'] = dayjs(decision?.updated).format('YYYY-MM-DD');
    renderBody.parameters['permitFirstname'] = owner?.firstName;
    renderBody.parameters['permitLastname'] = owner?.lastName;
    renderBody.parameters['creationDate'] = dayjs(decision?.created).format('YYYY-MM-DD');
    renderBody.parameters['disabilityReason'] = errand.extraParameters['application.reason'];
  } else if (templateType === 'decision') {
    renderBody.parameters['decisionText'] = formData.description;
    renderBody.parameters['decisionDate'] = dayjs(decision?.decidedAt).format('YYYY-MM-DD');
    if (outcome === 'approval') {
      renderBody.parameters['permitFirstname'] = owner?.firstName;
      renderBody.parameters['permitLastname'] = owner?.lastName;
      renderBody.parameters['permitEndDate'] = dayjs(formData.validTo).format('YYYY-MM-DD');
    }
  }
  if (outcome === 'cancellation') {
    renderBody.parameters['creationDate'] = dayjs(decision?.created).format('YYYY-MM-DD');
  }
  renderBody.parameters['description'] = formData.description;

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

    renderBody.parameters['lawReferences'] = lawReferences;

    if (services && services.length > 0) {
      renderBody.parameters['services'] = services.map((service) => {
        const serviceData: any = {
          restyp: service.restyp + (service.isWinterService ? ' (Vinterfärdtjänst)' : ''),
          validFrom: service.startDate ? dayjs(service.startDate).format('YYYY-MM-DD') : '',
          validTo: service.endDate ? dayjs(service.endDate).format('YYYY-MM-DD') : '',
          validityType: service.validityType,
        };

        if (service.transportMode?.length > 0) {
          serviceData.transportMode = service.transportMode.join(', ');
        }

        if (service.aids?.length > 0) {
          serviceData.aids = service.aids.join(', ');
        }

        if (service.addon?.length > 0) {
          serviceData.addon = service.addon.join(', ');
        }

        return serviceData;
      });
    } else {
      renderBody.parameters['services'] = [];
    }
  }

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
      caseNumber: formData.errandNumber,
      administratorName: errand.administrator
        ? `${errand.administrator?.firstName} ${errand.administrator?.lastName}`
        : '',
      description: formData.description.replace(/<p>/g, '<p style="margin: 0;">'),
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
