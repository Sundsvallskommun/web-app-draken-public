import { expect, test } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  COORDINATED,
  inspectionProtocolDetailsOf,
  inspectionProtocolFileName,
  inspectionProtocolMeasureRow,
  SUMMARY,
  toInspectionProtocolParameters,
  VISIT,
  YES_NO,
} from './support-inspection-protocol-service';

const errand = { customer: [{ organizationName: 'Exempel AB', organizationNumber: '556000-0000' }] } as SupportErrand;

test('the permit holder and the inspector are filled in from the errand and the signed-in user', () => {
  const details = inspectionProtocolDetailsOf(errand, { name: 'Anna Andersson' });

  expect(details.permitHolderName).toBe('Exempel AB');
  expect(details.permitHolderOrgNumber).toBe('556000-0000');
  expect(details.inspector1NameAndTitle).toBe('Anna Andersson, handläggare');
  expect(details.inspectionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(details.summary).toBe('');
});

test('a private permit holder is named by first and last name', () => {
  const details = inspectionProtocolDetailsOf(
    { customer: [{ firstName: 'Bo', lastName: 'Berg' }] } as SupportErrand,
    undefined
  );

  expect(details.permitHolderName).toBe('Bo Berg');
  expect(details.inspector1NameAndTitle).toBe('');
});

test('a measure becomes a protocol row: completed marks U.A, not completed marks A, not applicable marks nothing', () => {
  expect(inspectionProtocolMeasureRow({ title: 'Nykterhet', result: 'COMPLETED', description: '' })).toEqual({
    title: 'Nykterhet',
    noRemark: 'X',
    remark: '',
    comment: '',
  });
  expect(
    inspectionProtocolMeasureRow({ title: 'Ålderskontroll', result: 'NOT_COMPLETED', description: 'Ingen leg' })
  ).toEqual({
    title: 'Ålderskontroll',
    noRemark: '',
    remark: 'X',
    comment: 'Ingen leg',
  });
  expect(inspectionProtocolMeasureRow({ title: 'Brandskydd', result: 'NOT_APPLICABLE' })).toMatchObject({
    noRemark: '',
    remark: '',
  });
  expect(inspectionProtocolMeasureRow({ title: 'Brandskydd' })).toMatchObject({ noRemark: '', remark: '' });
});

test('choices become "true" for the template\'s box macro, one per key, and unchosen boxes are sent empty', () => {
  const details = {
    ...inspectionProtocolDetailsOf(errand, undefined),
    visit: VISIT.CLOSED,
    coordinatedWith: [COORDINATED.POLICE, COORDINATED.OTHER],
    coordinatedOtherText: 'Tullen',
    securityGuard: YES_NO.YES,
    securityGuardCount: '2',
    summary: SUMMARY.ACTION_REQUIRED,
    summaryActionRequiredText: 'Åtgärda entrén',
  };

  const parameters = toInspectionProtocolParameters('AOT-26100063', details, [
    { title: 'Nykterhet', result: 'COMPLETED' },
  ]);

  expect(parameters).toMatchObject({
    caseNumber: 'AOT-26100063',
    visitInPremises: '',
    visitClosed: 'true',
    coordinatedNone: '',
    coordinatedPolice: 'true',
    coordinatedOther: 'true',
    coordinatedOtherText: 'Tullen',
    securityGuardYes: 'true',
    securityGuardNo: '',
    securityGuardCount: '2',
    summaryApproved: '',
    summaryApprovedActionRequired: 'true',
    summaryActionRequiredText: 'Åtgärda entrén',
    measures: [{ title: 'Nykterhet', noRemark: 'X', remark: '', comment: '' }],
  });
  expect(Object.values(parameters).every((value) => typeof value === 'string' || Array.isArray(value))).toBe(true);
});

test('the file is named after the errand and the inspection date', () => {
  expect(inspectionProtocolFileName('AOT-26100063', '2026-10-13')).toBe(
    'Tillsynsprotokoll AOT-26100063 2026-10-13.pdf'
  );
  expect(inspectionProtocolFileName(undefined, '2026-10-13')).toBe('Tillsynsprotokoll 2026-10-13.pdf');
});
