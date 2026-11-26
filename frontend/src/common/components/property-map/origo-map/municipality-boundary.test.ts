import { describe, expect, it } from 'vitest';

import { extractPolygons, isWithinExtent } from './municipality-boundary';
import type { MapExtent, PolygonCoordinates } from './origo.types';

const square: PolygonCoordinates = [
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 0],
  ],
];

describe('isWithinExtent', () => {
  const extent: MapExtent = [0, 0, 10, 10];

  it('accepts coordinates inside or on the edge', () => {
    expect(isWithinExtent([5, 5], extent)).toBe(true);
    expect(isWithinExtent([10, 0], extent)).toBe(true);
  });

  it('rejects coordinates outside', () => {
    expect(isWithinExtent([11, 5], extent)).toBe(false);
    expect(isWithinExtent([5, -1], extent)).toBe(false);
  });
});

describe('extractPolygons', () => {
  it('collects Polygon and flattens MultiPolygon geometries', () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        { geometry: { type: 'Polygon', coordinates: square } },
        { geometry: { type: 'MultiPolygon', coordinates: [square, square] } },
        { geometry: { type: 'Point', coordinates: [1, 2] } },
      ],
    };
    expect(extractPolygons(geojson)).toEqual([square, square, square]);
  });

  it('returns an empty list for malformed input', () => {
    expect(extractPolygons(null)).toEqual([]);
    expect(extractPolygons({ features: 'nope' })).toEqual([]);
    expect(extractPolygons({ features: [null, { geometry: { type: 'Polygon' } }] })).toEqual([]);
  });
});
