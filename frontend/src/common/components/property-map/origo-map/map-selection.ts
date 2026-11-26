import type Geometry from 'ol/geom/Geometry';

import type { OrigoSelectedItem, OrigoViewer } from './origo.types';

/** A selected map feature as plain data: its attributes without the geometry. */
export interface SelectedFeature {
  id: string;
  layerTitle: string;
  properties: Record<string, unknown>;
}

export const toSelectedFeature = (item: OrigoSelectedItem): SelectedFeature => {
  const feature = item.getFeature();
  const { [feature.getGeometryName()]: _geometry, ...properties } = feature.getProperties();
  return {
    id: item.getId(),
    layerTitle: item.getSelectionGroupTitle() ?? '',
    properties,
  };
};

/** Multiselect results, plus the popup's feature unless it is already among them. */
export const mergeSelections = (
  popupFeature: SelectedFeature | null,
  multiselectFeatures: SelectedFeature[]
): SelectedFeature[] =>
  popupFeature && !multiselectFeatures.some(({ id }) => id === popupFeature.id) ?
    [popupFeature, ...multiselectFeatures]
  : multiselectFeatures;

/**
 * Reports the combined selection from the click popup and the multiselect tools whenever
 * either changes. Bursts (a box selecting many features) are coalesced into one report.
 * Returns lookups for the reported features' geometries, kept out of the plain report: by id, and
 * the id of the one under a map coordinate.
 */
export const watchSelection = (viewer: OrigoViewer, onChange: (features: SelectedFeature[]) => void) => {
  const selectedItems = viewer.getSelectionManager().getSelectedItems();
  const featureinfo = viewer.getFeatureinfo();
  let popupItem: OrigoSelectedItem | null = null;
  let reportQueued = false;
  const geometries = new Map<string, Geometry>();

  const queueReport = () => {
    if (reportQueued) return;
    reportQueued = true;
    queueMicrotask(() => {
      reportQueued = false;
      const multiselected = selectedItems.getArray();

      geometries.clear();
      for (const item of popupItem ? [popupItem, ...multiselected] : multiselected) {
        const geometry = item.getFeature().getGeometry();
        if (geometry) geometries.set(item.getId(), geometry);
      }

      onChange(mergeSelections(popupItem && toSelectedFeature(popupItem), multiselected.map(toSelectedFeature)));
    });
  };

  selectedItems.on('add', queueReport);
  selectedItems.on('remove', queueReport);
  featureinfo.on('changeselection', (item) => {
    popupItem = item;
    queueReport();
  });
  featureinfo.on('clearselection', () => {
    popupItem = null;
    queueReport();
  });

  return {
    geometryOf: (id: string): Geometry | undefined => geometries.get(id),
    idAt: (coordinate: number[]): string | null => {
      for (const [id, geometry] of geometries) {
        if (geometry.intersectsCoordinate(coordinate)) return id;
      }
      return null;
    },
  };
};
