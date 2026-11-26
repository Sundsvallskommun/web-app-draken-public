// Typings for Origo's own API, which ships as untyped JavaScript loaded at runtime from
// karta.sundsvall.se (Sundsvall's fork, gis-origo2client). OpenLayers types come from the
// `ol` package (`OrigoOlNamespace` below). Only the Origo surface used here is described,
// checked against the fork's `origo.js` and `src/{viewer,selectionmanager,featureinfo}.js`.
// Extend these as the map grows instead of reaching for `any`.

import type Collection from 'ol/Collection';
import type Feature from 'ol/Feature';
import type * as olFormat from 'ol/format';
import type Geolocation from 'ol/Geolocation';
import type * as olGeom from 'ol/geom';
import type * as olInteraction from 'ol/interaction';
import type * as olLayer from 'ol/layer';
import type OlMap from 'ol/Map';
import type Overlay from 'ol/Overlay';
import type * as olProj from 'ol/proj';
import type * as olSource from 'ol/source';
import type * as olStyle from 'ol/style';

/**
 * The OpenLayers build Origo bundles and exposes as `Origo.ol`. Typed from the real `ol`
 * package (a types-only devDependency pinned to the version Sundsvall's Origo fork,
 * gis-origo2client, locks), so these are the exact classes running in the browser.
 * Mirrors the `Origo.ol.* = …` assignments in the fork's `origo.js`; add a member here
 * only when it is both exported there and used.
 */
export interface OrigoOlNamespace {
  Collection: typeof Collection;
  Feature: typeof Feature;
  Geolocation: typeof Geolocation;
  Overlay: typeof Overlay;
  format: typeof olFormat;
  geom: typeof olGeom;
  interaction: typeof olInteraction;
  layer: typeof olLayer;
  proj: typeof olProj;
  source: typeof olSource;
  style: typeof olStyle;
}

// Tuple versions of OpenLayers' `Coordinate` / `Extent` (which are plain `number[]`).
// Tuples keep `[x, y]` destructuring safe under `noUncheckedIndexedAccess` and are
// assignable wherever OpenLayers expects its own types.
export type MapCoordinate = [number, number];
export type MapExtent = [number, number, number, number];
type LinearRing = MapCoordinate[];
export type PolygonCoordinates = LinearRing[];

/** A point picked in the map: in the map projection (`PROJECTION.code`) and in WGS 84. */
export interface MapLocation {
  xy: MapCoordinate;
  lat: number;
  lon: number;
}

/** Origo components are opaque objects handed to `viewer.addComponent`. */
export type OrigoComponent = object;

/** A feature picked by the click popup or the multiselect tools (`src/models/SelectedItem.js`). */
export interface OrigoSelectedItem {
  getId(): string;
  getFeature(): Feature;
  getSelectionGroupTitle(): string | undefined;
}

/** Holds the multiselect results (and click results when featureinfo uses the infowindow). */
interface OrigoSelectionManager {
  getSelectedItems(): Collection<OrigoSelectedItem>;
}

/** The click popup. `changeselection` fires with the item currently shown in it. */
interface OrigoFeatureinfo {
  on(type: 'changeselection', listener: (item: OrigoSelectedItem) => void): void;
  on(type: 'clearselection', listener: () => void): void;
}

export interface OrigoViewer {
  getMap(): OlMap;
  addComponent(component: OrigoComponent): void;
  getSelectionManager(): OrigoSelectionManager;
  getFeatureinfo(): OrigoFeatureinfo;
}

interface OrigoInstance {
  on(event: 'load', listener: (viewer: OrigoViewer) => void): void;
  /** The viewer, once loaded. */
  api(): OrigoViewer;
}

export interface OrigoGlobal {
  (config: object, options: { svgSpritePath: string }): OrigoInstance;
  ol: OrigoOlNamespace;
}

type MultiselectTool = 'click' | 'box' | 'circle' | 'polygon';

/** The Multiselect plugin's UMD global (`plugins/multiselect.min.js`). */
type MultiselectFactory = (options: {
  tools: MultiselectTool[];
  default: MultiselectTool;
  showClearButton: boolean;
}) => OrigoComponent;

declare global {
  interface Window {
    Origo?: OrigoGlobal;
    Multiselect?: MultiselectFactory;
  }
}
