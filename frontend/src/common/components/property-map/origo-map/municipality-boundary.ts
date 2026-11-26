import type MultiPolygon from 'ol/geom/MultiPolygon';
import type OlMap from 'ol/Map';

import type { MapCoordinate, MapExtent, OrigoOlNamespace, PolygonCoordinates } from './origo.types';
import { MUNICIPALITY_WFS_URL, PROJECTION } from './origo-config';
import { createOverlayLayer, OVERLAY_Z_INDEX } from './overlay-layers';

const MASK_COLOR = 'rgba(150, 150, 150, 0.55)';
const BORDER_COLOR = '#005595';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Bounding-box check, used until the municipality polygon has loaded. */
export const isWithinExtent = (coordinate: MapCoordinate, extent: MapExtent): boolean => {
  const [minX, minY, maxX, maxY] = extent;
  const [x, y] = coordinate;
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
};

/** Collects every polygon from a GeoJSON FeatureCollection, flattening MultiPolygons. */
export const extractPolygons = (geojson: unknown): PolygonCoordinates[] => {
  if (!isRecord(geojson) || !Array.isArray(geojson.features)) return [];

  const polygons: PolygonCoordinates[] = [];
  for (const feature of geojson.features as unknown[]) {
    if (!isRecord(feature) || !isRecord(feature.geometry)) continue;
    const { type, coordinates } = feature.geometry;
    if (!Array.isArray(coordinates)) continue;

    if (type === 'Polygon') {
      polygons.push(coordinates as PolygonCoordinates);
    } else if (type === 'MultiPolygon') {
      polygons.push(...(coordinates as PolygonCoordinates[]));
    }
  }
  return polygons;
};

const projectionRing = () => {
  const [minX, minY, maxX, maxY] = PROJECTION.extent;
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
};

/**
 * Fetches the municipality outline, dims everything outside it and draws its border.
 * Resolves with the municipality geometry for point-in-polygon checks.
 */
export const addMunicipalityBoundary = async (ol: OrigoOlNamespace, map: OlMap): Promise<MultiPolygon> => {
  const response = await fetch(MUNICIPALITY_WFS_URL);
  if (!response.ok) {
    throw new Error(`Municipality WFS request failed: ${response.status}`);
  }
  const polygons = extractPolygons(await response.json());
  const municipality = new ol.geom.MultiPolygon(polygons);

  const mask = createOverlayLayer(
    ol,
    new ol.style.Style({ fill: new ol.style.Fill({ color: MASK_COLOR }) }),
    OVERLAY_Z_INDEX.municipalityMask
  );
  // Inverted polygon: the projection extent with the municipality rings as holes
  mask.show(new ol.geom.Polygon([projectionRing(), ...polygons.flat()]));
  map.addLayer(mask.layer);

  const border = createOverlayLayer(
    ol,
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: BORDER_COLOR, width: 2 }) }),
    OVERLAY_Z_INDEX.municipalityBorder
  );
  border.show(municipality);
  map.addLayer(border.layer);

  return municipality;
};
