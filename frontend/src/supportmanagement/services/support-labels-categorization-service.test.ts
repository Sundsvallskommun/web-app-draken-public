import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { describe, expect, test } from 'vitest';

import {
  getErrandLabelsSelection,
  isCompleteLabelsSelection,
  selectLabel,
  toLabelsFormValues,
  withLabelsSelection,
} from './support-labels-categorization-service';
import { SupportMetadata } from './support-metadata-service';

const label = (id: string, resourcePath: string, labels: Label[] = []): Label =>
  ({ id, classification: 'LEVEL', resourceName: id, resourcePath, displayName: id, labels } as Label);

// An errand stores copies of its labels, without the children of the tree.
const onErrand = (...labels: Label[]): Label[] => labels.map((errandLabel) => ({ ...errandLabel, labels: undefined }));

// Department, category, type and subtype below the root, as in KC. The BFF hands on the tree without its
// root, which SupportManagement still adds to the errand.
const root = label('root', 'ROOT');
const reminder = label('reminder', 'ROOT/KSK/KONTAKT/COMPLAINT/REMINDER');
const complaint = label('complaint', 'ROOT/KSK/KONTAKT/COMPLAINT', [reminder]);
const silentCall = label('silent-call', 'ROOT/KSK/KONTAKT/SILENT_CALL');
const kontakt = label('kontakt', 'ROOT/KSK/KONTAKT', [silentCall, complaint]);
const procurement = label('procurement', 'ROOT/KSK/PROCUREMENT');
const ksk = label('ksk', 'ROOT/KSK', [kontakt, procurement]);
const tradeUnion = label('trade-union', 'ROOT/TRADE_UNION');
const metadata = { labels: { labelStructure: [ksk, tradeUnion] } } as SupportMetadata;

const tag = label('tag', 'TAGROOT/INTERNAL_INSPECTION');

const ids = (labels: Label[]) => labels.map((errandLabel) => errandLabel.id);

describe('labels categorization', () => {
  test('reads levels 1 and 2 into the first combobox and levels 3 and 4 into the second', () => {
    const selection = getErrandLabelsSelection(onErrand(root, ksk, kontakt, complaint, reminder), metadata);

    expect(selection.first?.id).toBe('kontakt');
    expect(selection.second?.id).toBe('reminder');
    expect(isCompleteLabelsSelection(selection)).toBe(true);
  });

  test('takes a level 3 label without anything below it as the second choice', () => {
    const selection = getErrandLabelsSelection(onErrand(root, ksk, kontakt, silentCall), metadata);

    expect(selection.second?.id).toBe('silent-call');
    expect(toLabelsFormValues(selection)).toEqual({
      category: 'ROOT/KSK/KONTAKT',
      type: 'ROOT/KSK/KONTAKT/SILENT_CALL',
    });
  });

  test('completes the selection with the first choice when there is nothing below it', () => {
    const departmentOnly = getErrandLabelsSelection(onErrand(root, tradeUnion), metadata);
    const categoryOnly = getErrandLabelsSelection(onErrand(root, ksk, procurement), metadata);

    expect(departmentOnly.first?.id).toBe('trade-union');
    expect(isCompleteLabelsSelection(departmentOnly)).toBe(true);
    expect(toLabelsFormValues(departmentOnly)).toEqual({ category: 'ROOT/TRADE_UNION', type: 'ROOT/TRADE_UNION' });
    expect(isCompleteLabelsSelection(categoryOnly)).toBe(true);
  });

  test('leaves the selection incomplete while there is still something to pick in the second combobox', () => {
    const selection = getErrandLabelsSelection(onErrand(root, ksk, kontakt), metadata);

    expect(isCompleteLabelsSelection(selection)).toBe(false);
    expect(toLabelsFormValues(selection)).toEqual({ category: 'ROOT/KSK/KONTAKT', type: '' });
  });

  test('fills in the levels above a picked label', () => {
    expect(ids(selectLabel(silentCall, metadata).path)).toEqual(['ksk', 'kontakt', 'silent-call']);
    expect(ids(selectLabel(tradeUnion, metadata).path)).toEqual(['trade-union']);
    expect(selectLabel(undefined, metadata).path).toEqual([]);
  });

  test('has no choices for an errand without labels', () => {
    const selection = getErrandLabelsSelection([], metadata);

    expect(selection.first).toBeUndefined();
    expect(isCompleteLabelsSelection(selection)).toBe(false);
    expect(toLabelsFormValues(selection)).toEqual({ category: '', type: '' });
  });

  test('replaces the categorization of the errand and keeps its other labels', () => {
    const errandLabels = onErrand(root, ksk, kontakt, silentCall, tag);

    expect(ids(withLabelsSelection(errandLabels, selectLabel(tradeUnion, metadata), metadata))).toEqual([
      'root',
      'tag',
      'trade-union',
    ]);
  });

  test('drops the categorization of the errand while the selection is incomplete', () => {
    const errandLabels = onErrand(root, ksk, kontakt, silentCall, tag);

    expect(ids(withLabelsSelection(errandLabels, selectLabel(kontakt, metadata), metadata))).toEqual(['root', 'tag']);
  });
});
