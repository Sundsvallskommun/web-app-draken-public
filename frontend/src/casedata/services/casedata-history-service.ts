import { CaseLabels } from '@casedata/interfaces/case-label';
import {
  ErrandChange,
  ErrandHistory,
  GenericChangeData,
  ParsedErrandChange,
  ParsedErrandHistory,
} from '@casedata/interfaces/history';
import { PrettyRole } from '@casedata/interfaces/role';
import { ApiResponse, apiService } from '@common/services/api-service';
import { getUserInfo } from '@common/services/user-service';
import { Priority } from '@supportmanagement/interfaces/priority';
import dayjs from 'dayjs';
import { fetchAttachment, getAttachmentLabel } from './casedata-attachment-service';
import { fetchDecision, getDecisionLabel } from './casedata-decision-service';
import { fetchNote } from './casedata-errand-notes-service';
import { fetchMessage } from './casedata-message-service';
import { fetchStakeholder } from './casedata-stakeholder-service';

const relevantProperties = [
  'caseType',
  'priority',
  'phase',
  'statusType',
  'description',
  'startDate',
  'endDate',
  'diaryNumber',
  'extraParameters',
  'decisions',
  'stakeholders',
  'notes',
  'messageIds',
  'attachments',
];

export const getErrandHistory: (errandId: string) => Promise<ParsedErrandHistory> = (errandId) => {
  const url = `casedata/errands/${errandId}/history`;
  return apiService
    .get<ApiResponse<ErrandHistory>>(url)
    .then((res) =>
      res.data.data
        .filter((c) => typeof c?.property === 'undefined' || relevantProperties.includes(c.property))
        .map(parseChange)
    )
    .catch((e) => {
      console.error('Something went wrong when fetching errand history');
      throw e;
    });
};

const extraParametersMap = {
  'application.reason': 'Skäl',
  'application.role': 'Roll',
  'application.applicant.capacity': 'Söker som',
  'application.applicant.testimonial': 'Medgivande',
  'application.applicant.signingAbility': 'Kan signera',
  'disability.aid': 'Hjälpmedel',
  'disability.walkingAbility': 'Kan gå en kortare sträcka',
  'disability.walkingDistance.beforeRest': 'Gå innan vila (m)',
  'disability.walkingDistance.max': 'Gå inklusive vila (m)',
  'disability.duration': 'Varaktighet',
  'disability.canBeAloneWhileParking': 'Kan lämnas ensam under parkering',
  'disability.canBeAloneWhileParking.note': 'Kan lämnas ensam - anteckning',
  'consent.contact.doctor': 'Får läkare kontaktas',
  'consent.view.transportationServiceDetails': 'Får färdtjänstinformation hämtas',
  'application.renewal.changedCircumstances': 'Ändrade omständigheter',
  'application.renewal.expirationDate': 'Slutdatum',
  'application.renewal.medicalConfirmationRequired': 'Läkarintyg krävs',
  'application.lostPermit.policeReportNumber': 'Diarienummer',
  'artefact.permit.number': 'Kortnummer',
  'artefact.permit.status': 'Kortstatus',
  'application.supplement.dueDate': 'Komplettera senast',
  'application.priority': 'Prioritet',
  'process.phaseAction': 'Fasbyte',
  'process.phaseStatus': 'Fasbytets status',
};

const mapExtraParametersValue = (val: string) => {
  const extraParametersValueMap = {
    true: 'Ja',
    false: 'Nej',
    DRIVER: 'Förare',
    PASSENGER: 'Passagerare',
    CUSTODIAN: 'God man',
    SELF: 'Sökande',
    GUARDIAN: 'Vårdnadshavare',
    HIGH: 'Hög',
    MEDIUM: 'Medium',
    LOW: 'Låg',
    P6M: 'Mindre än 6 månader',
    P1Y: '6 månader till 1 år',
    P2Y: '1-2 år',
    P3Y: '2-3 år',
    P4Y: '3-4 år',
    P5Y: 'Mer än 4 år',
    P0Y: 'Bestående',
    COMPLETE: 'Begärt',
  };
  return val in extraParametersValueMap ? extraParametersValueMap[val] : val;
};

const mapAuthor = (author: string) => {
  getUserInfo(author);
  return author === 'UNKNOWN' ? 'Okänt' : author;
};

export const mapProperty = (c: ParsedErrandChange) => {
  const valueObject = c.globalId?.valueObject?.split('.').reverse()?.[0];
  switch (c.property) {
    case 'statusType':
      return 'Status';
    case 'caseType':
      return 'Ärendetyp';
    case 'priority':
      return 'Prioritet';
    case 'diaryNumber':
      return 'Diarienummer';
    case 'description':
      return valueObject === 'Status' ? 'Statusbeskrivning' : 'Beskrivning';
    case 'decisions':
      return 'Utredning/beslut';
    case 'phase':
      return 'Fas';
    case 'attachments':
      return 'Bilaga';
    case 'extraParameters':
      return 'Extraparametrar';
    default:
      return c.property;
  }
};

const mapRightLeftvalues = (c: ParsedErrandChange) => {
  if (c.property === 'caseType') {
    return { left: CaseLabels.ALL[c.left], right: CaseLabels.ALL[c.right] };
  } else if (c.property === 'priority') {
    return { left: Priority[c.left], right: Priority[c.right] };
  }
  return { left: c.left, right: c.right };
};

const parseChangeType: (c: ErrandChange) => { label: string; details: string } = (c) => {
  if (c.changeType === 'ListChange') {
    if (c.elementChanges?.[0].elementChangeType === 'ValueAdded') {
      switch (c.property) {
        case 'notes':
          return { label: 'Ny anteckning', details: `Innehåll: ` };
        case 'messageIds':
          return { label: 'Nytt meddelande', details: '' };
        case 'stakeholders':
          return { label: 'Ny handläggare/intressent', details: '' };
        case 'attachments':
          return { label: 'Ny bilaga', details: '' };
        case 'decisions':
          return { label: 'Ny utredning/beslut', details: '' };
        default:
          return { label: `Okänt ${c.property}`, details: '' };
      }
    } else if (c.elementChanges?.some((e) => e.elementChangeType === 'ValueRemoved')) {
      switch (c.property) {
        case 'notes':
          return { label: 'Anteckning togs bort', details: `Innehåll: ` };
        case 'stakeholders':
          return { label: 'Handläggare/intressent togs bort', details: '' };
        case 'attachments':
          return { label: 'Bilaga togs bort', details: '' };
        case 'decisions':
          return { label: 'Utredning/beslut togs bort', details: '' };
        default:
          return { label: `Okänt ${c.property} togs bort`, details: '' };
      }
    }
  } else if (c.changeType === 'ValueChange' || c.changeType === 'InitialValueChange') {
    const valueObject = c.globalId.valueObject?.split('.').reverse()?.[0];
    switch (c.property) {
      case 'statusType':
        return { label: `Status ändrades`, details: `Från "${c.left}" till "${c.right}"` };
      case 'description':
        const label = valueObject === 'Status' ? 'Statusbeskrivning ändrades' : 'Beskrivning ändrades';
        return {
          label,
          details: ``,
        };
      case 'phase':
        return { label: `Fas ${c.right} påbörjades`, details: '' };
      case 'stakeholders':
        return { label: `Handläggare/intressent ändrades`, details: '' };
      case 'caseType':
        return { label: `Ärendetyp ändrades`, details: '' };
      case 'diaryNumber':
        return { label: `Diarienummer ändrades`, details: '' };
      case 'priority':
        return { label: `Prioritet ändrades`, details: `${Priority[c.left]} till ${Priority[c.right]}` };
      default:
        return {
          label: `Okänt fält ${c.property} ändrades från "${c.left !== '' ? c.left : '(tomt)'}" till "${c.right}"`,
          details: '',
        };
    }
  } else if (c.changeType === 'MapChange') {
    switch (c.property) {
      case 'extraParameters':
        return { label: `Extraparametrar ändrades`, details: `${extraParametersMap[c.entryChanges?.[0].key]}` };
      case 'messageIds':
        return {
          label: `${c.entryChanges?.[0]?.entryChangeType === 'EntryAdded' ? 'Nytt meddelande' : 'Meddelandeändring'}`,
          details: ``,
        };
      default:
        return {
          label: `Okänt fält ${c.property} ändrades från "${c.left !== '' ? c.left : '(tomt)'}" till "${c.right}"`,
          details: '',
        };
    }
  } else if (c.changeType === 'NewObject') {
    return {
      label: `Ärendet skapades`,
      details: '',
    };
  }
  return { label: `${c.changeType} ${c.property}`, details: '' };
};

export const parseChange: (c: ErrandChange) => ParsedErrandChange = (c) => {
  return {
    ...c,
    parsed: {
      errandId: c.globalId?.cdoId?.toString() || c.globalId?.ownerId?.cdoId?.toString(),
      event: parseChangeType(c),
      datetime: dayjs(c.commitMetadata.commitDate).format('YYYY-MM-DD, HH:mm'),
      administrator: mapAuthor(c.commitMetadata.author),
    },
  };
};

const genericFailedFetch = () => {
  const data: GenericChangeData = {
    type: 'Borttaget objekt',
    title: undefined,
    content: `<p>Information om det borttagna objektet kan inte visas</p>`,
    date: null,
  };
  return data;
};

export const fetchChangeData: (errandId: number, c: ParsedErrandChange) => Promise<GenericChangeData> = (
  errandId,
  c
) => {
  if (c?.changeType === 'ListChange') {
    if (c.elementChanges?.[0].elementChangeType === 'ValueAdded') {
      switch (c.property) {
        case 'notes':
          return fetchNote(errandId, c.elementChanges?.[0].value.cdoId.toString())
            .then((res) => {
              const data: GenericChangeData = {
                type: res.data.extraParameters['type'] === 'comment' ? 'Ny kommentar' : 'Ny tjänsteanteckning',
                title: res.data.title,
                content: res.data.text,
                date: res.data.updated,
              };
              return data;
            })
            .catch(genericFailedFetch);
        case 'stakeholders':
          return fetchStakeholder(errandId, c.elementChanges?.[0].value.cdoId.toString())
            .then((res) => {
              const data: GenericChangeData = {
                type: 'Ny handläggare/intressent',
                title: undefined,
                content: `<p>Roll: ${PrettyRole[res.data.roles?.[0]]}</p><p>Namn: ${res.data.firstName} ${
                  res.data.lastName
                }</p>`,
                date: res.data.updated,
              };
              return data;
            })
            .catch(genericFailedFetch);
        case 'attachments':
          return fetchAttachment(errandId, c.elementChanges?.[0].value.cdoId.toString())
            .then((res) => {
              const data: GenericChangeData = {
                type: 'Ny bilaga',
                title: getAttachmentLabel(res.data),
                content: `<p>Filnamn: ${res.data.name}</p>`,
                date: res.data.updated,
              };
              return data;
            })
            .catch(genericFailedFetch);
        case 'decisions':
          return fetchDecision(c.elementChanges?.[0].value.cdoId.toString())
            .then((res) => {
              const data: GenericChangeData = {
                type: 'Ny utredning/beslut',
                title: getDecisionLabel(res.data.decisionOutcome),
                content: `<p>${res.data.description}</p>${
                  res.data.validFrom && res.data.validTo
                    ? `<p>Giltighetstid: ${dayjs(res.data.validFrom).format('YYYY-MM-DD')} - ${dayjs(
                        res.data.validTo
                      ).format('YYYY-MM-DD')}</p>`
                    : ''
                }`,
                date: res.data.updated,
              };
              return data;
            })
            .catch(genericFailedFetch);
        default:
          return Promise.reject();
      }
    } else if (c.elementChanges?.filter((e) => e.elementChangeType === 'ValueRemoved').length === 1) {
      const data: GenericChangeData = {
        type: '',
        title: undefined,
        content: `<p>Information om det borttagna objektet kan inte visas</p>`,
        date: null,
      };
      switch (c.property) {
        case 'stakeholders':
          data.type = 'Handläggare/intressent togs bort';
          break;
        case 'notes':
          data.type = 'Anteckning togs bort';
          break;
        default:
          break;
      }
      return Promise.resolve(data);
    } else {
      return Promise.reject();
    }
  } else if (c?.changeType === 'ValueChange' || c?.changeType === 'InitialValueChange') {
    const details: GenericChangeData = {
      type: mapProperty(c),
      title: undefined,
      content: `<p><strong>Tidigare värde:</strong> <em>${
        c.left ? mapRightLeftvalues(c).left : '(tomt)'
      }</em></p><p><strong>Nytt värde:</strong> <em>${c.right ? mapRightLeftvalues(c).right : '(tomt)'}</em></p>`,
      date: dayjs(c.commitMetadata.commitDate).format('YYYY-MM-DD HH:mm:ss'),
    };
    return Promise.resolve(details);
  } else if (c?.changeType === 'MapChange' && c?.property === 'messageIds') {
    return fetchMessage(c.entryChanges?.[0]?.key as any)
      .then((res) => {
        const data: GenericChangeData = {
          type: 'Nytt meddelande',
          title: res?.data.content.subject || '',
          content: `Innehåll: <p><em>${res?.data.content.message || ''}</em></p>`,
          date: res?.data.timestamp || '',
        };
        return data;
      })
      .catch(genericFailedFetch);
  } else if (c?.changeType === 'MapChange' && c?.property === 'extraParameters') {
    const details: GenericChangeData = {
      type: mapProperty(c),
      title: 'Ändrades till:',
      content: `<ul>${c.entryChanges
        .map((e, idx) => {
          const s =
            e.leftValue || e.rightValue
              ? `<li key='${idx}'><i>${extraParametersMap[e.key]}</i> ändrades från ${e.leftValue || '(tomt)'} till ${
                  e.rightValue || '(tomt)'
                }</li>`
              : `<li key='${idx}'><i>${extraParametersMap[e.key]}</i>: ${
                  !e.value ? '(tomt)' : mapExtraParametersValue(e.value)
                }</li>`;
          return s;
        })
        .join('')}</ul>`,
      date: dayjs(c.commitMetadata.commitDate).format('YYYY-MM-DD HH:mm:ss'),
    };
    return Promise.resolve(details);
  } else if (c?.changeType === 'NewObject') {
    const details: GenericChangeData = {
      type: 'Ärendet skapades',
      title: undefined,
      content: undefined,
      date: dayjs(c.commitMetadata.commitDate).format('YYYY-MM-DD HH:mm:ss'),
    };
    return Promise.resolve(details);
  }
};
