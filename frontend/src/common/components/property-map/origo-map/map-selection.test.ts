import Feature from 'ol/Feature';
import MultiPolygon from 'ol/geom/MultiPolygon';
import { describe, expect, it, vi } from 'vitest';

import { mergeSelections, type SelectedFeature, toSelectedFeature, watchSelection } from './map-selection';
import type { OrigoSelectedItem, OrigoViewer } from './origo.types';

const fakeItem = (id: string, properties: Record<string, unknown> = {}): OrigoSelectedItem => ({
  getId: () => id,
  getSelectionGroupTitle: () => 'Fastigheter',
  getFeature: () => {
    const feature = new Feature({ geom: new MultiPolygon([]), ...properties });
    feature.setGeometryName('geom');
    return feature;
  },
});

const feature = (id: string): SelectedFeature => ({ id, layerTitle: 'Fastigheter', properties: {} });

type Listener = (...args: unknown[]) => void;

const fakeViewer = () => {
  const items: OrigoSelectedItem[] = [];
  const listeners = new Map<string, Listener[]>();
  const on = (type: string, listener: Listener) => {
    listeners.set(type, [...(listeners.get(type) ?? []), listener]);
  };
  const emit = (type: string, ...args: unknown[]) => {
    listeners.get(type)?.forEach((listener) => {
      listener(...args);
    });
  };
  const viewer = {
    getSelectionManager: () => ({ getSelectedItems: () => ({ getArray: () => items, on }) }),
    getFeatureinfo: () => ({ on }),
  } as unknown as OrigoViewer;
  return { viewer, items, emit };
};

const flushMicrotasks = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

describe('toSelectedFeature', () => {
  it('keeps id, layer title and attributes but drops the geometry', () => {
    expect(toSelectedFeature(fakeItem('Fastighet_yta.1', { FBET: 'GRANLO 1:53', AREA: 836 }))).toEqual({
      id: 'Fastighet_yta.1',
      layerTitle: 'Fastigheter',
      properties: { FBET: 'GRANLO 1:53', AREA: 836 },
    });
  });
});

describe('mergeSelections', () => {
  it('puts the popup feature first when it is not already selected', () => {
    expect(mergeSelections(feature('a'), [feature('b')]).map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('does not duplicate a popup feature that is also multiselected', () => {
    expect(mergeSelections(feature('b'), [feature('b')]).map(({ id }) => id)).toEqual(['b']);
  });

  it('returns the multiselect features when there is no popup', () => {
    expect(mergeSelections(null, [feature('b')]).map(({ id }) => id)).toEqual(['b']);
  });
});

describe('watchSelection', () => {
  it('looks up the geometry of reported features, and forgets those no longer selected', async () => {
    const { viewer, items, emit } = fakeViewer();
    const { geometryOf } = watchSelection(viewer, vi.fn());

    const popup = fakeItem('popup');
    emit('changeselection', popup);
    items.push(fakeItem('multi'));
    emit('add');
    await flushMicrotasks();

    expect(geometryOf('popup')).toBeInstanceOf(MultiPolygon);
    expect(geometryOf('multi')).toBeInstanceOf(MultiPolygon);

    emit('clearselection');
    await flushMicrotasks();

    expect(geometryOf('popup')).toBeUndefined();
    expect(geometryOf('multi')).toBeInstanceOf(MultiPolygon);
  });

  it('finds the selected feature under a coordinate', async () => {
    const { viewer, items, emit } = fakeViewer();
    const { idAt } = watchSelection(viewer, vi.fn());
    const square = (id: string, x: number): OrigoSelectedItem => ({
      getId: () => id,
      getSelectionGroupTitle: () => 'Fastigheter',
      getFeature: () =>
        new Feature({
          geometry: new MultiPolygon([[[[x, 0], [x + 10, 0], [x + 10, 10], [x, 10], [x, 0]]]]),
        }),
    });

    items.push(square('left', 0), square('right', 20));
    emit('add');
    await flushMicrotasks();

    expect(idAt([5, 5])).toBe('left');
    expect(idAt([25, 5])).toBe('right');
    expect(idAt([15, 5])).toBeNull();
  });

  it('reports a burst of multiselect additions once', async () => {
    const { viewer, items, emit } = fakeViewer();
    const onChange = vi.fn();
    watchSelection(viewer, onChange);

    items.push(fakeItem('a'), fakeItem('b'));
    emit('add');
    emit('add');
    await flushMicrotasks();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.lastCall?.[0]).toMatchObject([{ id: 'a' }, { id: 'b' }]);
  });

  it('tracks the popup feature until the popup is cleared', async () => {
    const { viewer, emit } = fakeViewer();
    const onChange = vi.fn();
    watchSelection(viewer, onChange);

    emit('changeselection', fakeItem('popup'));
    await flushMicrotasks();
    expect(onChange.mock.lastCall?.[0]).toMatchObject([{ id: 'popup' }]);

    emit('clearselection');
    await flushMicrotasks();
    expect(onChange.mock.lastCall?.[0]).toEqual([]);
  });
});
