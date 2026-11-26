'use client';

import type Geometry from 'ol/geom/Geometry';
import type MultiPolygon from 'ol/geom/MultiPolygon';
import type OlMap from 'ol/Map';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { type SelectedFeature, watchSelection } from './map-selection';
import { addMissingIcons } from './missing-icons';
import { addMunicipalityBoundary, isWithinExtent } from './municipality-boundary';
import type { MapCoordinate, MapLocation, OrigoOlNamespace } from './origo.types';
import { ORIGO_ASSETS, ORIGO_CONFIG, ORIGO_TARGET_ID, PROJECTION } from './origo-config';
import { loadOrigo } from './origo-loader';
import {
  createOverlayLayer,
  highlightStyle,
  locationMarkerStyle,
  OVERLAY_Z_INDEX,
  userPositionStyle,
} from './overlay-layers';
import { addMultiselect, locateUserOnce, removeDefaultControls } from './viewer-setup';

interface UseOrigoMapOptions {
  /** A location picked by clicking the map (or "use my position"); it gets a marker. */
  onLocationChange?: (location: MapLocation) => void;
  /** Features picked with the click popup or the multiselect tools. */
  onSelectionChange?: (features: SelectedFeature[]) => void;
  /** Id of a selected feature (as in `onSelectionChange`) to outline in the map, or null for none. */
  highlightedId?: string | null;
  /** The selected feature under the pointer, by id; null when the pointer leaves it. Reported on change only. */
  onHoverChange?: (id: string | null) => void;
}

/** A built map and what the hook needs from it after it has loaded. */
interface MapRuntime {
  ol: OrigoOlNamespace;
  map: OlMap;
  /** Null until the outline has loaded; checks fall back to the bounding box until then. */
  municipality: MultiPolygon | null;
  userPosition: MapCoordinate | null;
  showLocationMarker: (geometry: Geometry | undefined) => void;
  showHighlight: (geometry: Geometry | undefined) => void;
  geometryOf: (id: string) => Geometry | undefined;
}

const isWithinMunicipality = ({ municipality }: MapRuntime, coordinate: MapCoordinate) =>
  municipality?.intersectsCoordinate(coordinate) ?? isWithinExtent(coordinate, PROJECTION.municipalityExtent);

/** Waits until `element` is in the document (Origo finds its target by selector), or until cancelled. */
const whenConnected = (element: HTMLElement, cancelled: () => boolean) =>
  new Promise<void>((resolve) => {
    const check = () => (element.isConnected || cancelled() ? resolve() : requestAnimationFrame(check));
    check();
  });

/**
 * One Origo map for the lifetime of the calling component. The map lives in `element`, which this hook
 * owns; `OrigoMap` only shows it where it's rendered. Rendering `OrigoMap` somewhere else (a modal and
 * back) moves the same map, with its view, layers and selection, instead of building a new one.
 */
export const useOrigoMap = ({
  onLocationChange,
  onSelectionChange,
  highlightedId = null,
  onHoverChange,
}: UseOrigoMapOptions) => {
  // Origo takes its target as a selector; one id per map, so two maps (or an old and a new one) never share it.
  const targetId = `${ORIGO_TARGET_ID}-${useId().replace(/[^\w-]/g, '')}`;
  // Created on the client only (no document while server rendering); never re-created.
  const [element] = useState<HTMLDivElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const div = document.createElement('div');
    div.id = targetId;
    div.className = 'origo-map h-full w-full';
    return div;
  });
  const runtimeRef = useRef<MapRuntime | null>(null);
  // The latest callbacks, so map listeners registered once always call the current ones.
  const callbacksRef = useRef({ onLocationChange, onSelectionChange, onHoverChange });

  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [hasUserPosition, setHasUserPosition] = useState(false);
  const [outsideMunicipality, setOutsideMunicipality] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onLocationChange, onSelectionChange, onHoverChange };
  }, [onLocationChange, onSelectionChange, onHoverChange]);

  /** Places the location marker if inside the municipality. Returns whether it was placed. */
  const selectLocation = useCallback((xy: MapCoordinate) => {
    const runtime = runtimeRef.current;
    if (!runtime) return false;

    if (!isWithinMunicipality(runtime, xy)) {
      setOutsideMunicipality(true);
      return false;
    }
    setOutsideMunicipality(false);

    runtime.showLocationMarker(new runtime.ol.geom.Point(xy));
    const [lon, lat] = runtime.ol.proj.toLonLat(xy, PROJECTION.code) as MapCoordinate;
    callbacksRef.current.onLocationChange?.({ xy, lat, lon });
    return true;
  }, []);

  const goToUserPosition = useCallback(() => {
    const runtime = runtimeRef.current;
    const position = runtime?.userPosition;
    if (!runtime || !position || !selectLocation(position)) return;
    runtime.map.getView().animate({ center: position, zoom: PROJECTION.userZoom });
  }, [selectLocation]);

  // Builds the map on mount and takes it down on unmount, so the owner can be remounted
  // (re-keyed, Fast Refresh) without old maps lingering on removed elements.
  useEffect(() => {
    if (!element) return undefined;
    let disposed = false;
    let builtMap: OlMap | null = null;
    let stopLocating: (() => void) | undefined;
    let reportHover: (id: string | null) => void = () => {};
    const onLeave = () => reportHover(null);

    const init = async () => {
      const Origo = await loadOrigo();
      await whenConnected(element, () => disposed);
      if (disposed) return;

      const origo = Origo({ ...ORIGO_CONFIG, target: `#${targetId}` }, { svgSpritePath: ORIGO_ASSETS.svgSpritePath });

      origo.on('load', (viewer) => {
        const map = viewer.getMap();
        if (disposed) {
          map.setTarget(undefined);
          return;
        }
        const { ol } = Origo;
        builtMap = map;

        removeDefaultControls(map, element);
        addMissingIcons();
        addMultiselect(viewer);

        let hoveredId: string | null = null;
        reportHover = (id: string | null) => {
          if (id === hoveredId) return;
          hoveredId = id;
          callbacksRef.current.onHoverChange?.(id);
        };
        const selection = watchSelection(viewer, (features) => {
          hoveredId = null; // a new selection starts without a hover; the next move reports again
          callbacksRef.current.onSelectionChange?.(features);
        });
        map.on('pointermove', (e) => {
          if (!e.dragging) reportHover(selection.idAt(e.coordinate));
        });
        element.addEventListener('mouseleave', onLeave);

        const highlight = createOverlayLayer(ol, highlightStyle(ol), OVERLAY_Z_INDEX.highlight);
        const userDot = createOverlayLayer(ol, userPositionStyle(ol), OVERLAY_Z_INDEX.userPosition);
        const marker = createOverlayLayer(ol, locationMarkerStyle(ol), OVERLAY_Z_INDEX.locationMarker);
        [highlight, userDot, marker].forEach(({ layer }) => map.addLayer(layer));

        const runtime: MapRuntime = {
          ol,
          map,
          municipality: null,
          userPosition: null,
          showLocationMarker: marker.show,
          showHighlight: highlight.show,
          geometryOf: selection.geometryOf,
        };
        runtimeRef.current = runtime;
        setMapReady(true);

        stopLocating = locateUserOnce(ol, map, (coordinate) => {
          if (!isWithinMunicipality(runtime, coordinate)) return;
          runtime.userPosition = coordinate;
          setHasUserPosition(true);
          userDot.show(new ol.geom.Point(coordinate));
          map.getView().animate({ center: coordinate, zoom: PROJECTION.userZoom });
        });

        addMunicipalityBoundary(ol, map)
          .then((municipality) => {
            runtime.municipality = municipality;
          })
          .catch((error: unknown) => {
            // Non-critical: validation falls back to the bounding box
            console.warn('Failed to load municipality boundary.', error);
          });

        // Doesn't stop the click: Origo's feature info and the multiselect plugin still get it.
        map.on('click', ({ coordinate: [x, y] }) => {
          if (x !== undefined && y !== undefined) selectLocation([x, y]);
        });
      });
    };

    init()
      .catch((error: unknown) => {
        console.error('Failed to load Origo map.', error);
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });

    return () => {
      disposed = true;
      stopLocating?.();
      element.removeEventListener('mouseleave', onLeave);
      builtMap?.setTarget(undefined);
      element.replaceChildren();
      element.remove();
      runtimeRef.current = null;
      setMapReady(false);
    };
  }, [element, targetId, selectLocation]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!mapReady || !runtime) return;
    // A copy: the selected feature keeps its own geometry.
    runtime.showHighlight(highlightedId ? runtime.geometryOf(highlightedId)?.clone() : undefined);
  }, [mapReady, highlightedId]);

  return { element, loading, hasUserPosition, outsideMunicipality, goToUserPosition };
};

export type OrigoMapHandle = ReturnType<typeof useOrigoMap>;
