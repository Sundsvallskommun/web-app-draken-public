import { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';

export interface ParametersObject {
  RECRUITMENT?: Parameter[];
}

const template: ParametersObject = {
  RECRUITMENT: [
    {
      key: 'recruitment@upstart',
      displayName: 'Uppstart',
      group: 'Uppstartsmöte',
      values: ['Uppstartsmöte genomfört', 'true', 'defaulttext'],
    },
    {
      key: 'recruitment@upstart',
      displayName: 'Uppstart',
      group: 'Kravprofil',
      values: ['Kravprofil upprättad', 'false', 'mer defaulttext'],
    },
    {
      key: 'recruitment@upstart',
      displayName: 'Uppstart',
      group: 'Tidsplan och annonseringskanal',
      values: ['Tidsplan och annonseringskanal upprättad', 'false', ''],
    },
    {
      key: 'recruitment@advertisement',
      displayName: 'Annonspublicering',
      group: 'Annonsering',
      values: ['Annons skapad och chef godkänt', 'false'],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Urvalsmöte',
      values: ['Urvalsmöte genomfört', 'false'],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Internkontroll',
      values: ['Internkontroll genomförd', 'false', ''],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Intervjuunderlag',
      values: ['Intervjuunderlag skapade', 'false'],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Bedömningsmallar',
      values: ['Bedömningsmallar skapade', 'false'],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Intervjutider',
      values: ['Intervjutider skapade', 'false'],
    },
    {
      key: 'recruitment@selection',
      displayName: 'Urval och intervjuer',
      group: 'Tester',
      values: ['Tester skapade och skickade', 'false', ''],
    },
    {
      key: 'recruitment@references',
      displayName: 'Referenstagning',
      group: 'Dokumentation',
      values: ['All befintlig dokumentation är skapad och dokumenterad', 'false'],
    },
    {
      key: 'recruitment@closure',
      displayName: 'Avslut',
      group: 'Avstämning',
      values: ['Avstämning med chefen', 'false', ''],
    },
    {
      key: 'recruitment@closure',
      displayName: 'Avslut',
      group: 'Återkoppling',
      values: ['Återkoppling till slutkandidat', 'false', ''],
    },
    {
      key: 'recruitment@closure',
      displayName: 'Avslut',
      group: 'Återkoppling',
      values: ['Återkoppling till övriga kandidater', 'false', ''],
    },
  ],
};

export const getRecruitmentParameters = () => {
  const recruitmentParameters = [...template['RECRUITMENT']];

  return recruitmentParameters.reduce(function (r, a) {
    r[a.key] = r[a.key] || [];
    r[a.key].push(a);
    return r;
  }, Object.create(null));
};

export const saveParameters = (parameters) => {
  parameters.recruitment.map((parameter) => console.log(parameter));
  return true;
};
