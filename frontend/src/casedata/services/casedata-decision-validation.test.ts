import assert from 'node:assert/strict';

import { FTCaseType, PTCaseType } from '@casedata/interfaces/case-type';
import { Channels } from '@casedata/interfaces/channels';
import { IErrand } from '@casedata/interfaces/errand';
import { ErrandPhase } from '@casedata/interfaces/errand-phase';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { Role } from '@casedata/interfaces/role';
import { afterAll, beforeAll, test, vi } from 'vitest';

let service: typeof import('./casedata-errand-service');

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_APPLICATION', 'PT');
  vi.stubEnv('NEXT_PUBLIC_MUNICIPALITY_ID', '2281');
  service = await import('./casedata-errand-service');
});

afterAll(() => vi.unstubAllEnvs());

const errandForDecision = (caseType: string, extraParameters: IErrand['extraParameters']): IErrand => ({
  id: 1,
  externalCaseId: '',
  errandNumber: 'PT-2026-1',
  caseType,
  label: '',
  description: '',
  administrator: { id: 'admin', type: 'PERSON', roles: [Role.ADMINISTRATOR], created: '', updated: '' },
  administratorName: '',
  priority: 'MEDIUM',
  status: { statusType: ErrandStatus.UnderUtredning },
  statuses: [],
  phase: ErrandPhase.utredning,
  channel: Channels.WEB_UI,
  municipalityId: '2281',
  stakeholders: [],
  created: '',
  updated: '',
  notes: [],
  decisions: [],
  attachments: [],
  messageIds: [],
  extraParameters,
});

test('a lost permit requires the police report number in Sundsvall and returns the form label', () => {
  const errand = errandForDecision(PTCaseType.LOST_PARKING_PERMIT, [
    { key: 'application.lostPermit.policeReportNumber', values: [] },
  ]);
  assert.deepEqual(service.validateExtraParametersForDecision(errand, '2281'), {
    valid: false,
    reason: '"Diarie/ärendenummer för polisanmälan"',
  });
  errand.extraParameters[0].values = ['K123456'];
  assert.deepEqual(service.validateExtraParametersForDecision(errand, '2281'), { valid: true, reason: '' });
});

test('decision eligibility passes the runtime municipality through to its extra parameter requirements', async () => {
  const { stakeholder2Contact } = await import('./casedata-stakeholder-service');
  const errand = errandForDecision(PTCaseType.LOST_PARKING_PERMIT, [
    { key: 'application.lostPermit.policeReportNumber', values: [] },
    { key: 'application.applicant.capacity', values: ['DRIVER'] },
    { key: 'application.applicant.signingAbility', values: ['false'] },
  ]);
  errand.stakeholders = [
    stakeholder2Contact({ id: 'applicant', type: 'PERSON', roles: [Role.APPLICANT], created: '', updated: '' }),
  ];
  assert.equal(service.validateErrandForDecision(errand, '2260'), true);
  assert.equal(service.validateErrandForDecision(errand, '2281'), false);
  errand.extraParameters[0].values = ['K123456'];
  assert.equal(service.validateErrandForDecision(errand, '2281'), true);
});

test.each([
  ['2281', 'application.lostPermit.policeReportNumber'],
  ['2260', 'application.applicant.capacity'],
  ['2260', 'application.applicant.signingAbility'],
])('%s rejects absent and empty values for its required %s field', (municipalityId, field) => {
  const errand = errandForDecision(PTCaseType.LOST_PARKING_PERMIT, [
    { key: 'application.lostPermit.policeReportNumber', values: ['K123456'] },
    { key: 'application.applicant.capacity', values: ['DRIVER'] },
    { key: 'application.applicant.signingAbility', values: ['false'] },
  ]);
  const parameter = errand.extraParameters.find((entry) => entry.key === field)!;
  const validValues = parameter.values;
  for (const values of [undefined, [], [''], [' ', '\t']]) {
    parameter.values = values;
    assert.equal(service.validateExtraParametersForDecision(errand, municipalityId).valid, false);
  }
  parameter.values = validValues;
  assert.equal(service.validateExtraParametersForDecision(errand, municipalityId).valid, true);
  errand.extraParameters = errand.extraParameters.filter((entry) => entry.key !== field);
  assert.equal(service.validateExtraParametersForDecision(errand, municipalityId).valid, false);
});

test.each(['application.applicant.capacity', 'application.applicant.signingAbility'])(
  'Ånge requires %s from the runtime municipality even when the build environment is Sundsvall',
  (missingField) => {
    const errand = errandForDecision(PTCaseType.PARKING_PERMIT, [
      { key: 'application.applicant.capacity', values: ['DRIVER'] },
      { key: 'application.applicant.signingAbility', values: ['false'] },
      { key: 'disability.duration', values: ['PERMANENT'] },
      { key: 'disability.walkingAbility', values: ['false'] },
    ]);
    errand.extraParameters.find((parameter) => parameter.key === missingField)!.values = [];
    assert.equal(service.validateExtraParametersForDecision(errand, '2260').valid, false);
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, true);
  }
);

test.each([PTCaseType.PARKING_PERMIT, PTCaseType.PARKING_PERMIT_RENEWAL])(
  '%s requires duration and walking ability, plus answers for passengers and applicants able to walk',
  (caseType) => {
    const errand = errandForDecision(caseType, [
      { key: 'application.applicant.capacity', values: ['DRIVER'] },
      { key: 'disability.duration', values: ['PERMANENT'] },
      { key: 'disability.walkingAbility', values: ['false'] },
      { key: 'disability.canBeAloneWhileParking', values: [] },
      { key: 'disability.walkingDistance.max', values: [] },
    ]);
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, true);
    for (const field of ['disability.duration', 'disability.walkingAbility']) {
      const parameter = errand.extraParameters.find((entry) => entry.key === field)!;
      const originalValues = parameter.values;
      parameter.values = [];
      assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, false);
      parameter.values = originalValues;
    }

    errand.extraParameters[0].values = ['PASSENGER'];
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, false);
    errand.extraParameters[3].values = ['true'];
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, true);

    errand.extraParameters[2].values = ['true'];
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, false);
    errand.extraParameters[4].values = ['100'];
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, true);
  }
);

test.each([PTCaseType.APPEAL, PTCaseType.DOCUMENTATION_ERRAND, FTCaseType.PARATRANSIT_NOTIFICATION])(
  '%s retains its separate requirements instead of inheriting parking permit fields',
  (caseType) => {
    const errand = errandForDecision(caseType, [
      { key: 'disability.duration', values: [] },
      { key: 'disability.walkingAbility', values: [] },
      { key: 'application.lostPermit.policeReportNumber', values: [] },
    ]);
    assert.equal(service.validateExtraParametersForDecision(errand, '2281').valid, true);
  }
);
