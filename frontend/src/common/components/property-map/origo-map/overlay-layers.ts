import type Geometry from 'ol/geom/Geometry';
import type Style from 'ol/style/Style';

import type { OrigoOlNamespace } from './origo.types';
import { LEGEND_HIDDEN_GROUP } from './origo-config';

/** Stacking order of the layers we draw ourselves, all above Origo's own layers. */
export const OVERLAY_Z_INDEX = {
  municipalityMask: 1,
  municipalityBorder: 2,
  highlight: 3,
  userPosition: 4,
  locationMarker: 5,
} as const;

/**
 * A vector layer for something we draw ourselves (mask, border, marker, highlight). Kept out of
 * Origo's legend. Shows one geometry at a time: `show` replaces it, or clears it with `undefined`.
 */
export const createOverlayLayer = (ol: OrigoOlNamespace, style: Style | Style[], zIndex: number) => {
  const source = new ol.source.Vector();
  const layer = new ol.layer.Vector({ source, style, zIndex, properties: { group: LEGEND_HIDDEN_GROUP } });

  const show = (geometry: Geometry | undefined) => {
    source.clear();
    if (geometry) source.addFeature(new ol.Feature({ geometry }));
  };

  return { layer, show };
};

const circle = (ol: OrigoOlNamespace, radius: number, color: string, strokeWidth: number) =>
  new ol.style.Style({
    image: new ol.style.Circle({
      radius,
      fill: new ol.style.Fill({ color }),
      stroke: new ol.style.Stroke({ color: '#ffffff', width: strokeWidth }),
    }),
  });

export const locationMarkerStyle = (ol: OrigoOlNamespace) => circle(ol, 10, '#e74c3c', 2.5);

export const userPositionStyle = (ol: OrigoOlNamespace) => circle(ol, 7, '#005595', 2);

/** Origo's selection blue, which the multiselect plugin outlines selected properties with. */
const SELECTION_BLUE = 'rgb(0, 153, 255)';

/**
 * Outlines a selected property, e.g. the one hovered in the table. Origo's own `highlighted`
 * multiselection style: a white halo under a thicker blue line, so it stands out from the
 * plain blue outline every selected property already has.
 */
export const highlightStyle = (ol: OrigoOlNamespace) => [
  new ol.style.Style({
    stroke: new ol.style.Stroke({ color: '#ffffff', width: 6 }),
    fill: new ol.style.Fill({ color: 'rgba(0, 153, 255, 0.25)' }),
  }),
  new ol.style.Style({ stroke: new ol.style.Stroke({ color: SELECTION_BLUE, width: 4 }) }),
];
