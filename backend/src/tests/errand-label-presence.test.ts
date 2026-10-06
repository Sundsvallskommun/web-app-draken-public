import type { Errand, Label } from '@/data-contracts/supportmanagement/data-contracts';
import { buildLabelPresenceUpdate } from '@/services/errand-label-presence';

const labelStructure: Label[] = [
  {
    id: 'risk-root',
    classification: 'risk-root',
    resourceName: 'RISK',
    resourcePath: 'RISK',
    labels: [{ id: 'high-hsl', classification: 'risk', resourceName: 'HIGH_HSL', resourcePath: 'RISK/HIGH_HSL', labels: [] }],
  },
  {
    id: 'report-root',
    classification: 'report-type-root',
    resourceName: 'REPORT_TYPE',
    resourcePath: 'REPORT_TYPE',
    labels: [{ id: 'deviation', classification: 'report-type', resourceName: 'DEVIATION', resourcePath: 'REPORT_TYPE/DEVIATION', labels: [] }],
  },
];

const carried = (...ids: string[]): Errand['labels'] => ids.map(id => ({ id }));
const update = (currentLabels: Errand['labels'], present: boolean, structure: Label[] = labelStructure) =>
  buildLabelPresenceUpdate({ currentLabels, labelStructure: structure, resourcePath: 'RISK/HIGH_HSL', present });

describe('buildLabelPresenceUpdate', () => {
  it('adds the label with its root and keeps every other label', () => {
    expect(update(carried('report-root', 'deviation'), true)).toEqual([
      { id: 'report-root' },
      { id: 'deviation' },
      { id: 'risk-root' },
      { id: 'high-hsl' },
    ]);
  });

  it('takes the label away, and its root with it once nothing is left beneath', () => {
    expect(update(carried('report-root', 'deviation', 'risk-root', 'high-hsl'), false)).toEqual([{ id: 'report-root' }, { id: 'deviation' }]);
  });

  it('writes nothing when the errand already looks that way', () => {
    expect(update(carried('deviation', 'risk-root', 'high-hsl'), true)).toBeUndefined();
    expect(update(carried('report-root', 'deviation'), false)).toBeUndefined();
  });

  it('leaves the errand alone when the namespace has not configured the label', () => {
    expect(update(carried('deviation'), true, labelStructure.slice(1))).toBeUndefined();
  });
});
