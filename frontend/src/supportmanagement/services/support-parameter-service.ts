import { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { apiService } from '@common/services/api-service';
import { ApiSupportErrand } from './support-errand-service';
import { SupportErrandDto } from 'src/data-contracts/backend/data-contracts';

export interface ParametersObject {
  RECRUITMENT?: Parameter[];
}

const template: ParametersObject = {
  RECRUITMENT: [
    {
      key: 'recruitment@upstart_0',
      displayName: 'Uppstart',
      group: 'Uppstartsmöte',
      values: ['Uppstartsmöte genomfört', 'false', ''],
    },
    {
      key: 'recruitment@upstart_1',
      displayName: 'Uppstart',
      group: 'Kravprofil',
      values: ['Kravprofil upprättad', 'false', ''],
    },
    {
      key: 'recruitment@upstart_2',
      displayName: 'Uppstart',
      group: 'Tidsplan och annonseringskanal',
      values: ['Tidsplan och annonseringskanal upprättad', 'false', ''],
    },
    {
      key: 'recruitment@advertisement_0',
      displayName: 'Annonspublicering',
      group: 'Annonsering',
      values: ['Annons skapad och chef godkänt', 'false'],
    },
    {
      key: 'recruitment@selection_1',
      displayName: 'Urval och intervjuer',
      group: 'Urvalsmöte',
      values: ['Urvalsmöte genomfört', 'false'],
    },
    {
      key: 'recruitment@selection_2',
      displayName: 'Urval och intervjuer',
      group: 'Internkontroll',
      values: ['Internkontroll genomförd', 'false', ''],
    },
    {
      key: 'recruitment@selection_3',
      displayName: 'Urval och intervjuer',
      group: 'Intervjuunderlag',
      values: ['Intervjuunderlag skapade', 'false'],
    },
    {
      key: 'recruitment@selection_4',
      displayName: 'Urval och intervjuer',
      group: 'Bedömningsmallar',
      values: ['Bedömningsmallar skapade', 'false'],
    },
    {
      key: 'recruitment@selection_5',
      displayName: 'Urval och intervjuer',
      group: 'Intervjutider',
      values: ['Intervjutider skapade', 'false'],
    },
    {
      key: 'recruitment@selection_6',
      displayName: 'Urval och intervjuer',
      group: 'Tester',
      values: ['Tester skapade och skickade', 'false', ''],
    },
    {
      key: 'recruitment@references_0',
      displayName: 'Referenstagning',
      group: 'Dokumentation',
      values: ['All befintlig dokumentation är skapad och dokumenterad', 'false'],
    },
    {
      key: 'recruitment@closure_0',
      displayName: 'Avslut',
      group: 'Avstämning',
      values: ['Avstämning med chefen', 'false', ''],
    },
    {
      key: 'recruitment@closure_1',
      displayName: 'Avslut',
      group: 'Återkoppling',
      values: ['Återkoppling till slutkandidat', 'false', ''],
    },
    {
      key: 'recruitment@closure_2',
      displayName: 'Avslut',
      group: 'Återkoppling',
      values: ['Återkoppling till övriga kandidater', 'false', ''],
    },
  ],
};

export const getRecruitmentParameters = (errand: SupportErrandDto) => {
  const templateParameters = [...template['RECRUITMENT']];
  const errandParameters = errand.parameters.filter((p) => p.key.startsWith('recruitment@'));

  const reducer = function (r, a) {
    const groupKey = a.key.split('_')[0];
    r[groupKey] = r[groupKey] ?? [];
    r[groupKey].push(a);
    return r;
  };

  const reducedTemplate = templateParameters.reduce(reducer, Object.create(null));
  const reducedErrand = errandParameters.reduce(reducer, Object.create(null));

  const combined = { ...reducedTemplate, ...reducedErrand };

  return combined;
};

export const saveParameters = (errandId, municipalityId, parameters: { [key: string]: Parameter[] }) => {
  const paramsList = Object.values(parameters).flat(1);
  return apiService
    .patch<ApiSupportErrand, Partial<SupportErrandDto>>(`supporterrands/${municipalityId}/${errandId}`, {
      parameters: paramsList,
    })
    .catch((e) => {
      console.error('Something went wrong when patching errand');
      throw e;
    });
};
