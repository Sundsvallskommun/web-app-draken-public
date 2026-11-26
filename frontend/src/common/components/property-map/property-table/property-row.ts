import type { SelectedFeature } from '../origo-map/map-selection';
import { MUNICIPALITY_NAME } from '../origo-map/origo-config';

/** A row in the selected-properties table, from a `SundsvallsKommun:Fastighet_yta` feature. */
export interface PropertyRow {
  id: string;
  /** As in the layer (FBET), without the municipality, e.g. `GRANLO 1:53`. */
  designation: string;
  /** With the municipality, as property registers store it, e.g. `SUNDSVALL GRANLO 1:53`. */
  fullDesignation: string;
  tract: string;
  areaSquareMeters: number | null;
  reportUrl: string | null;
}

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** Only http(s) links are rendered, so attribute data can't inject e.g. `javascript:` URLs. */
const asWebUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
};

/** Maps a selected feature to a property row, or `null` if it isn't a property (no FBET). */
export const toPropertyRow = ({ id, properties }: SelectedFeature): PropertyRow | null => {
  const designation = asText(properties.FBET);
  if (!designation) return null;

  const area = properties.AREA;
  return {
    id,
    designation,
    fullDesignation: `${MUNICIPALITY_NAME} ${designation}`,
    tract: asText(properties.TRAKT),
    areaSquareMeters: typeof area === 'number' && Number.isFinite(area) ? area : null,
    reportUrl: asWebUrl(properties.link),
  };
};
