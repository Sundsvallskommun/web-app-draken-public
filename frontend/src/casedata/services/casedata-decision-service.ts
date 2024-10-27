import { UtredningFormModel } from '@casedata/components/errand/sidebar/sidebar-utredning.component';
import { DecisionFormModel } from '@casedata/components/errand/tabs/decision/casedata-decision-tab';
import { Attachment } from '@casedata/interfaces/attachment';
import { Decision, DecisionOutcome, DecisionType } from '@casedata/interfaces/decision';
import { IErrand } from '@casedata/interfaces/errand';
import { Render, TemplateSelector } from '@common/interfaces/template';
import { ApiResponse, apiService } from '@common/services/api-service';
import { isMEX, isPT } from '@common/services/application-service';
import { base64Decode } from '@common/services/helper-service';
import dayjs from 'dayjs';
import { getOwnerStakeholder } from './casedata-stakeholder-service';

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
  const obj: Decision = {
    ...(formData.id && { id: formData.id }),
    decisionType,
    decisionOutcome: formData.outcome as DecisionOutcome,
    description: formData.description,
    law: [
      isPT()
        ? {
            heading: formData.law[0].heading,
            sfs: formData.law[0].sfs,
            chapter: formData.law[0].chapter,
            article: formData.law[0].article,
          }
        : {
            heading: '',
            sfs: '',
            chapter: '',
            article: '',
          },
    ],
    validFrom: isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validFrom).toISOString() : undefined,
    validTo: isPT() && formData.outcome === 'APPROVAL' ? dayjs(formData.validTo).toISOString() : undefined,
    decidedAt: dayjs().toISOString(),
    decidedBy: formData.decidedBy,
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
  const capacity =
    outcome === 'CANCELLATION'
      ? 'all'
      : errand.extraParameters['application.applicant.capacity'] === 'DRIVER'
      ? 'driver'
      : errand.extraParameters['application.applicant.capacity'] === 'PASSENGER'
      ? 'passenger'
      : '';
  const identifier = `sbk.rph.${templateType}.phrases.${capacity}.${outcome.toLowerCase()}`;
  const selector: TemplateSelector = {
    identifier: identifier,
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
  d: UtredningFormModel | DecisionFormModel
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, d) => {
  return renderPdf(errand, d, 'investigation');
};

export const renderBeslutPdf: (
  errand: IErrand,
  d: UtredningFormModel | DecisionFormModel
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, d) => {
  return renderPdf(errand, d, 'decision');
};

export const renderPdf: (
  errand: IErrand,
  formData: UtredningFormModel | DecisionFormModel,
  templateType: 'investigation' | 'decision'
) => Promise<{ pdfBase64: string; error?: string }> = async (errand, formData, templateType) => {
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
  const capacity =
    outcome === 'cancellation'
      ? 'all'
      : errand.extraParameters['application.applicant.capacity'] === 'DRIVER'
      ? 'driver'
      : errand.extraParameters['application.applicant.capacity'] === 'PASSENGER'
      ? 'passenger'
      : '';
  const identifier = isMEX()
    ? `mex.decision`
    : isPT()
    ? `sbk.rph.${outcome === 'cancellation' ? 'decision' : templateType}.${capacity}.${outcome}`
    : `mex.decision`;
  const owner = getOwnerStakeholder(errand);
  const renderBody: TemplateSelector = {
    identifier: identifier,
    parameters: {
      caseNumber: formData.errandNumber,
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
