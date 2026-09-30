import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import { resolveErrandLabelPath } from './support-label-service';
import { SupportMetadata } from './support-metadata-service';

const label = (id: string, classification: string, resourcePath: string, labels: Label[] = []): Label =>
  ({ id, classification, resourcePath, resourceName: resourcePath, displayName: resourcePath, labels } as Label);

// An errand stores copies of its labels, without the children of the tree.
const onErrand = (...labels: Label[]): Label[] => labels.map((errandLabel) => ({ ...errandLabel, labels: undefined }));

const metadataWith = (labelStructure: Label[]) => ({ labels: { labelStructure } } as unknown as SupportMetadata);

// Levels named CATEGORY/TYPE/SUBTYPE, as in LOP.
const pensionReport = label('report', 'SUBTYPE', 'PENSION/STATISTICS/REPORT');
const pensionStatistics = label('statistics', 'TYPE', 'PENSION/STATISTICS', [pensionReport]);
const pension = label('pension', 'CATEGORY', 'PENSION', [pensionStatistics]);
const salary = label('salary', 'CATEGORY', 'SALARY', [label('salary-other', 'TYPE', 'SALARY/OTHER')]);

// Levels named DEPARTMENT/CATEGORY/TYPE, as in KC, including a department without children.
const silentCall = label('silent-call', 'TYPE', 'KSK/KONTAKT_SUNDSVALL/SILENT_CALL');
const kontaktSundsvall = label('kontakt-sundsvall', 'CATEGORY', 'KSK/KONTAKT_SUNDSVALL', [silentCall]);
const ksk = label('ksk', 'DEPARTMENT', 'KSK', [kontaktSundsvall]);
const tradeUnion = label('trade-union', 'DEPARTMENT', 'TRADE_UNION');

describe('resolveErrandLabelPath', () => {
  test('resolves the levels of a CATEGORY/TYPE/SUBTYPE tree by position', () => {
    const metadata = metadataWith([salary, pension]);

    expect(resolveErrandLabelPath(onErrand(pension, pensionStatistics, pensionReport), metadata)).toEqual([
      pension,
      pensionStatistics,
      pensionReport,
    ]);
  });

  test('resolves the levels of a DEPARTMENT/CATEGORY/TYPE tree by position', () => {
    const metadata = metadataWith([tradeUnion, ksk]);

    expect(resolveErrandLabelPath(onErrand(silentCall, ksk, kontaktSundsvall), metadata)).toEqual([
      ksk,
      kontaktSundsvall,
      silentCall,
    ]);
  });

  test('resolves a top-level label without children on its own', () => {
    expect(resolveErrandLabelPath(onErrand(tradeUnion), metadataWith([tradeUnion, ksk]))).toEqual([tradeUnion]);
  });

  test('fills in the ancestors when the errand only carries its most specific label', () => {
    expect(resolveErrandLabelPath(onErrand(silentCall), metadataWith([ksk]))).toEqual([
      ksk,
      kontaktSundsvall,
      silentCall,
    ]);
  });

  test('matches on resource path when the id is not in the tree', () => {
    const renamed = { ...pensionStatistics, id: 'an-old-id', labels: undefined };

    expect(resolveErrandLabelPath([renamed], metadataWith([pension]))).toEqual([pension, pensionStatistics]);
  });

  test('returns nothing when the errand has no labels or the tree is not loaded', () => {
    expect(resolveErrandLabelPath([], metadataWith([pension]))).toEqual([]);
    expect(resolveErrandLabelPath(undefined, metadataWith([pension]))).toEqual([]);
    expect(resolveErrandLabelPath(onErrand(pension), undefined)).toEqual([]);
  });

  test('returns nothing when none of the labels are in the tree', () => {
    expect(resolveErrandLabelPath([label('unknown', 'CATEGORY', 'UNKNOWN')], metadataWith([pension]))).toEqual([]);
  });
});
