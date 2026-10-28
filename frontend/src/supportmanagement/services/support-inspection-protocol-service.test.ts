import { renderTemplatePdf, renderTemplatePdfDirect } from '@common/services/template-render-service';
import { INSPECTION_PROTOCOL_TEMPLATES, inspectionProtocolTemplate } from '@supportmanagement/inspection-protocols';
import internalSample from '@supportmanagement/inspection-protocols/internal-inspection/sampledata.json';
import servingSample from '@supportmanagement/inspection-protocols/serving-permit/sampledata.json';
import { expect, test, vi } from 'vitest';

import type { SupportErrand } from './support-errand-service';
import {
  inspectionProtocolFileName,
  inspectionProtocolMeasureRow,
  inspectionProtocolValuesFromParameters,
  inspectionProtocolValuesOf,
  renderInspectionProtocol,
  toInspectionProtocolInvestigationParameters,
  toInspectionProtocolRenderParameters,
} from './support-inspection-protocol-service';

vi.mock('@common/services/template-render-service', () => ({
  renderTemplatePdf: vi.fn(async () => 'by-identifier'),
  renderTemplatePdfDirect: vi.fn(async () => 'direct'),
}));

const serving = inspectionProtocolTemplate('serving_permit')!;
const internal = inspectionProtocolTemplate('internal_inspection')!;
const errand = { customer: [{ organizationName: 'Exempel AB', organizationNumber: '556000-0000' }] } as SupportErrand;
const samples: Record<string, object> = { serving_permit: servingSample, internal_inspection: internalSample };

test('a template is found by its key', () => {
  expect(inspectionProtocolTemplate('internal_inspection')?.label).toBe('Inre tillsyn');
  expect(inspectionProtocolTemplate('nope')).toBeUndefined();
  expect(inspectionProtocolTemplate(undefined)).toBeUndefined();
});

test('the permit holder, the inspector and the date are filled in from the errand and the signed-in user', () => {
  const values = inspectionProtocolValuesOf(serving, errand, { name: 'Anna Andersson' });

  expect(values.permitHolderName).toBe('Exempel AB');
  expect(values.permitHolderOrgNumber).toBe('556000-0000');
  expect(values.inspector1NameAndTitle).toBe('Anna Andersson, handläggare');
  expect(values.inspectionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(values.summary).toBe('');
  expect(values.coordinatedWith).toEqual([]);
  expect(values.securityGuardCount).toBe('');
});

test('a private permit holder is named by first and last name', () => {
  const values = inspectionProtocolValuesOf(
    serving,
    { customer: [{ firstName: 'Bo', lastName: 'Berg' }] } as SupportErrand,
    undefined
  );

  expect(values.permitHolderName).toBe('Bo Berg');
  expect(values.inspector1NameAndTitle).toBe('');
});

test('answers are saved as one parameter per answered field, named after the field, and read back', () => {
  const values = {
    ...inspectionProtocolValuesOf(serving, errand, undefined),
    visit: 'closed',
    coordinatedWith: ['police', 'other'],
    coordinatedOtherText: 'Tullen',
    additionalRemarks: '  ',
  };

  const parameters = toInspectionProtocolInvestigationParameters(serving, values);

  expect(parameters).toContainEqual({ key: 'visit', displayName: 'Besök i lokalen', values: ['closed'] });
  expect(parameters).toContainEqual({
    key: 'coordinatedWith',
    displayName: 'Samordnad tillsyn tillsammans med',
    values: ['police', 'other'],
  });
  expect(parameters).toContainEqual({ key: 'coordinatedOtherText', displayName: 'Vilken', values: ['Tullen'] });
  expect(parameters.find((parameter) => parameter.key === 'additionalRemarks')).toBeUndefined();
  expect(parameters.find((parameter) => parameter.key === 'summary')).toBeUndefined();

  const fallback = inspectionProtocolValuesOf(serving, undefined, { name: 'Anna' });
  const read = inspectionProtocolValuesFromParameters(serving, parameters, fallback);
  expect(read.visit).toBe('closed');
  expect(read.coordinatedWith).toEqual(['police', 'other']);
  expect(read.permitHolderName).toBe('Exempel AB');
  expect(read.summary).toBe('');
  expect(read.inspector1NameAndTitle).toBe('Anna, handläggare');
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

test('choices become "true" for the template\'s box macro, one per option, and unchosen boxes are sent empty', () => {
  const values = {
    ...inspectionProtocolValuesOf(serving, errand, undefined),
    visit: 'closed',
    coordinatedWith: ['police', 'other'],
    coordinatedOtherText: 'Tullen',
    securityGuard: 'yes',
    securityGuardCount: '2',
    summary: 'actionRequired',
    summaryActionRequiredText: 'Åtgärda entrén',
  };

  const parameters = toInspectionProtocolRenderParameters(
    serving,
    'AOT-26100063',
    values,
    [{ title: 'Nykterhet', result: 'COMPLETED' }],
    []
  );

  expect(parameters).toMatchObject({
    caseNumber: 'AOT-26100063',
    permitHolderName: 'Exempel AB',
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

test('an observed item is marked under its area only while the area is deficient', () => {
  const parameters = toInspectionProtocolRenderParameters(
    serving,
    'X',
    inspectionProtocolValuesOf(serving, undefined, undefined),
    [],
    [
      { title: 'Uteservering', result: 'NOT_COMPLETED', resultText: 'CrowdedTables|Littering' },
      { title: 'Toaletter', result: 'COMPLETED', resultText: 'Vomit' },
    ]
  );

  expect(parameters).toMatchObject({
    orderWithoutRemarks: '',
    orderWithRemarks: 'true',
    observationCrowdedTablesOutdoor: 'X',
    observationLitteringOutdoor: 'X',
    observationGlassBreakageOutdoor: '',
    observationCrowdedTablesIndoor: '',
    observationVomitToilets: '',
  });
});

test('the order is without remarks while no area is deficient', () => {
  const parameters = toInspectionProtocolRenderParameters(
    serving,
    'X',
    inspectionProtocolValuesOf(serving, undefined, undefined),
    [],
    [{ title: 'Toaletter', result: 'COMPLETED' }]
  );

  expect(parameters).toMatchObject({ orderWithoutRemarks: 'true', orderWithRemarks: '' });
});

test.each(INSPECTION_PROTOCOL_TEMPLATES)(
  'every key $key sends is in its sample data, so the HTML knows it',
  (template) => {
    const sent = Object.keys(
      toInspectionProtocolRenderParameters(
        template,
        'X',
        inspectionProtocolValuesOf(template, undefined, undefined),
        [],
        []
      )
    );

    expect(Object.keys(samples[template.key])).toEqual(expect.arrayContaining(sent));
    expect(template.html).toContain('{% for m in measures %}');
    expect(template.controlPoints.length).toBeGreaterThan(0);
  }
);

test('the protocol is rendered directly while the template is in the code, by identifier once uploaded', async () => {
  await expect(renderInspectionProtocol(internal, { caseNumber: 'X' })).resolves.toBe('direct');
  expect(renderTemplatePdfDirect).toHaveBeenCalledWith(internal.html, { caseNumber: 'X' });

  await expect(renderInspectionProtocol({ ...internal, html: undefined }, { caseNumber: 'X' })).resolves.toBe(
    'by-identifier'
  );
  expect(renderTemplatePdf).toHaveBeenCalledWith('internal-inspection-protocol', { caseNumber: 'X' });
});

test('the file is named after the errand and the inspection date', () => {
  expect(inspectionProtocolFileName('AOT-26100063', '2026-10-13')).toBe(
    'Tillsynsprotokoll AOT-26100063 2026-10-13.pdf'
  );
  expect(inspectionProtocolFileName(undefined, '2026-10-13')).toBe('Tillsynsprotokoll 2026-10-13.pdf');
});
