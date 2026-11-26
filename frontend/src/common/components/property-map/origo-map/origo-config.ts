import type { MapCoordinate, MapExtent } from './origo.types';

const ORIGO_BASE_URL = 'https://karta.sundsvall.se/origo2client';

export const ORIGO_ASSETS = {
  css: `${ORIGO_BASE_URL}/css/style.css`,
  js: `${ORIGO_BASE_URL}/dist/origo.min.js`,
  multiselectCss: `${ORIGO_BASE_URL}/plugins/multiselect.css`,
  multiselectJs: `${ORIGO_BASE_URL}/plugins/multiselect.min.js`,
  svgSpritePath: `${ORIGO_BASE_URL}/css/svg/`,
};

/** Prefix of the DOM id of the element Origo renders into; each map adds its own suffix. */
export const ORIGO_TARGET_ID = 'origo-map';

/** The municipality the map covers, as it prefixes property designations. */
export const MUNICIPALITY_NAME = 'SUNDSVALL';

interface MapProjection {
  code: string;
  /** Name shown next to map coordinates. */
  label: string;
  proj4Def: { code: string; alias: string; projection: string };
  /** The projection's extent. Part of its definition, like the tile grid: never derive it from geography. */
  extent: MapExtent;
  /** Origin and extent of the WMS tiles; must match the server's gridset. */
  tileGridExtent: MapExtent;
  resolutions: number[];
  /** Sundsvall centrum (Stora torget). */
  center: MapCoordinate;
  /** Sundsvall kommun's bounding box, from the outline at `MUNICIPALITY_WFS_URL`. */
  municipalityExtent: MapExtent;
  /** Start zoom, and the zoom when centering on the user's position: indexes into `resolutions`. */
  zoom: number;
  userZoom: number;
}

/**
 * Everything that depends on the map's projection. Every coordinate in the map (clicks, selections, the
 * municipality outline) is in it, so data fetched for the map must be requested in `code` too. Changing
 * projection means replacing all of this. Same projection, tile grid and resolutions as
 * internkarta.sundsvall.se.
 */
export const PROJECTION: MapProjection = {
  code: 'EPSG:3014',
  label: 'SWEREF 99 17 15',
  proj4Def: {
    code: 'EPSG:3014',
    alias: 'urn:ogc:def:crs:EPSG::3014',
    projection:
      '+proj=tmerc +lat_0=0 +lon_0=17.25 +k=1 +x_0=150000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  },
  extent: [0, 6880000, 233360, 7090000],
  tileGridExtent: [400, 6880000, 233360, 7090000],
  resolutions: [560, 280, 140, 70, 28, 14, 7, 4.2, 2.8, 1.4, 0.56, 0.28, 0.14, 0.112, 0.056, 0.028, 0.014, 0.007],
  center: [152947, 6920489],
  municipalityExtent: [98072, 6886949, 200899, 6982498],
  zoom: 6,
  userZoom: 9,
};

export const MUNICIPALITY_WFS_URL = `https://karta.sundsvall.se/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=SundsvallsKommun:SundsvallsKommun_yta&outputFormat=application/json&srsName=${PROJECTION.code}`;

/**
 * Origo's legend lists every layer except those in the "none" and "background" groups. Our own helper
 * layers (mask, border, markers, highlight) go in "none": they are not something to toggle there.
 */
export const LEGEND_HIDDEN_GROUP = 'none';

/** The queryable property layer; its features are what the map selects. */
const PROPERTIES_LAYER_NAME = 'SundsvallsKommun:Fastighet_yta';

/** GeoServer WMS endpoint and the Origo source name it is registered under. */
const WMS_URL = 'https://karta.sundsvall.se/geoserver/wms';
const WMS_SOURCE_NAME = 'sundsvall-wms';

const LANTMATERIET_ATTRIBUTION =
  'Kartan har ingen rättsverkan och du kan alltså INTE se exakta gränser i denna karttjänst &copy Lantmäteriet Geodatasamverkan';

/**
 * The background maps, as on internkarta. Origo's legend shows the "background" group as a row of
 * buttons, one map at a time; each button shows the layer's thumbnail (an image on karta.sundsvall.se).
 * Listed in the order Origo reverses them into, so "Karta, grå" comes first.
 */
const BACKGROUND_MAPS: { name: string; title: string; thumbnail: string; format?: string; visible?: boolean }[] = [
  { name: 'Lantmateriet:Ortofoto50_25cm', title: 'Flygfoto', thumbnail: 'orto', format: 'image/jpeg' },
  { name: 'Lantmateriet:topowebbkartan', title: 'Karta, färg', thumbnail: 'farg' },
  { name: 'Lantmateriet:topowebbkartan_nedtonad', title: 'Karta, grå', thumbnail: 'gra', visible: true },
];

/**
 * The whole map setup: Sundsvall's extent and projection and the property layers `PropertyRow` reads.
 * `useOrigoMap` uses it directly, so `origo-map/` is part of the property map, not a general map.
 */
export const ORIGO_CONFIG = {
  projectionCode: PROJECTION.code,
  projectionExtent: PROJECTION.extent,
  proj4Defs: [PROJECTION.proj4Def],
  tileGridOptions: { extent: PROJECTION.tileGridExtent },
  resolutions: PROJECTION.resolutions,
  extent: PROJECTION.municipalityExtent,
  center: PROJECTION.center,
  zoom: PROJECTION.zoom,
  layers: [
    {
      // Queryable on the server (unlike Lantmateriet:fastighet_granser, which is cascaded and not queryable)
      name: PROPERTIES_LAYER_NAME,
      // Query on click even while hidden; Origo's default ("pixel") only queries where the layer draws.
      imageFeatureInfoMode: 'always',
      title: 'Fastighetsgränser',
      format: 'image/png',
      queryable: true,
      visible: false,
      opacity: 0.5,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      tiled: true,
    },
    {
      name: 'SundsvallsKommun:FastighetBeteckning_punkt',
      title: 'Fastighetsbeteckningar',
      format: 'image/png',
      queryable: true,
      visible: false,
      opacity: 1,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      tiled: true,
    },
    {
      // name: 'SundsvallsKommun:FordjupadOversiktsPlanOmraden_yta',
      name: 'SundsvallsKommun:OP_MangfunktionellBebyggelse_yta',
      title: 'Översiktsplan fördjupad ',
      format: 'image/png',
      queryable: false,
      visible: true,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      // Legend with several entries: shown when the layer is expanded, not squeezed into the row icon.
      hasThemeLegend: true,
      tiled: true,
    },
    {
      name: 'SundsvallsKommun:OversiktsPlanOmraden_yta',
      title: 'Översiktsplan 2040',
      format: 'image/png',
      queryable: false,
      visible: true,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      tiled: true,
    },
    {
      name: 'SundsvallsKommun:DetaljplanGallande_yta',
      title: 'Detaljplaner',
      format: 'image/png',
      queryable: false,
      visible: false,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      tiled: true,
    },

    {
      name: 'SundsvallsKommun:OP_MangfunktionellBebyggelse_TOT',
      title: 'Mångfunktionell bebyggelse',
      format: 'image/png',
      queryable: false,
      visible: true,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      // Legend with several entries: shown when the layer is expanded, not squeezed into the row icon.
      hasThemeLegend: true,
      tiled: true,
    },
    {
      name: 'SundsvallsKommun:OP_SammanhangandeBostadsbebyggelse_TOT',
      title: 'Sammanhängande bebyggelse',
      format: 'image/png',
      queryable: false,
      visible: true,
      type: 'WMS',
      group: 'root',
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      // Legend with several entries: shown when the layer is expanded, not squeezed into the row icon.
      hasThemeLegend: true,
      tiled: true,
    },
    ...BACKGROUND_MAPS.map(({ name, title, thumbnail, format = 'image/png', visible = false }) => ({
      name,
      title,
      format,
      queryable: false,
      visible,
      type: 'WMS',
      group: 'background',
      // Names the thumbnail in `styles`; without a `wmsStyle` there, the server's default style is used.
      style: thumbnail,
      attribution: LANTMATERIET_ATTRIBUTION,
      source: WMS_SOURCE_NAME,
      tiled: true,
    })),
  ],
  styles: Object.fromEntries(
    BACKGROUND_MAPS.map(({ thumbnail }) => [
      thumbnail,
      [[{ image: { src: `${ORIGO_BASE_URL}/img/png/${thumbnail}.png` } }]],
    ])
  ),
  source: {
    [WMS_SOURCE_NAME]: {
      url: WMS_URL,
      version: '1.1.1',
      service: 'WMS',
    },
  },
  // Origo's layer panel, for examining and toggling the layers. A fixed width, as on internkarta:
  // otherwise the widest legend image (even folded) stretches the panel over most of the map.
  controls: [{ name: 'legend', options: { expanded: true, contentStyle: { width: '337px' } } }],
};
