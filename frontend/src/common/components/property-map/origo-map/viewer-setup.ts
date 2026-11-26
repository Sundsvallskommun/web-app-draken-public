import type Control from 'ol/control/Control';
import type OlMap from 'ol/Map';

import type { MapCoordinate, OrigoOlNamespace, OrigoViewer } from './origo.types';

// OpenLayers declares `Control.element` protected; it is a plain public property at runtime.
const controlElement = (control: Control): unknown => Reflect.get(control, 'element');

const isZoomControl = (control: Control) => {
  const element = controlElement(control);
  return element instanceof HTMLElement && element.classList.contains('ol-zoom');
};

/** Removes every OpenLayers control except zoom (+/-), plus Origo's fullscreen button. */
export const removeDefaultControls = (map: OlMap, container: HTMLElement) => {
  map
    .getControls()
    .getArray()
    .slice()
    .forEach((control) => {
      if (isZoomControl(control)) return;
      map.removeControl(control);
    });

  container.querySelector('.o-fullscreen')?.remove();
};

/** Multiselect plugin: select features in queryable layers by click/box/circle/polygon. */
export const addMultiselect = (viewer: OrigoViewer) => {
  if (!window.Multiselect) return;
  viewer.addComponent(
    window.Multiselect({
      tools: ['click', 'box', 'circle', 'polygon'],
      default: 'box',
      showClearButton: true,
    })
  );
};

/**
 * Resolves the user's position once, in the map projection. Denied/unavailable is ignored.
 * Returns a function that stops waiting for it.
 */
export const locateUserOnce = (ol: OrigoOlNamespace, map: OlMap, onPosition: (coordinate: MapCoordinate) => void) => {
  const geolocation = new ol.Geolocation({
    tracking: true,
    projection: map.getView().getProjection(),
  });

  geolocation.on('change:position', () => {
    const [x, y] = geolocation.getPosition() ?? [];
    if (x === undefined || y === undefined) return;
    onPosition([x, y]);
    geolocation.setTracking(false);
  });

  return () => geolocation.setTracking(false);
};
