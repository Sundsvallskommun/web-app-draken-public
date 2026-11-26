'use client';

import './property-map.scss';

import { Button, Modal } from '@sk-web-gui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SelectedFeature } from './origo-map/map-selection';
import type { MapLocation } from './origo-map/origo.types';
import OrigoMap from './origo-map/origo-map.component';
import { useOrigoMap } from './origo-map/use-origo-map';
import type { PropertyRow } from './property-table/property-row';
import PropertyTable from './property-table/property-table.component';
import SelectedLocation from './selected-location.component';

interface PropertyMapProps {
  /** Shows a "Lägg till" button on properties that `isAdded` doesn't report as added. Omit to hide it. */
  onAdd?: (row: PropertyRow) => Promise<void>;
  isAdded?: (row: PropertyRow) => boolean;
}

/**
 * A map for picking properties, with the clicked location and a table of the selected properties.
 * Can be enlarged into a modal; the same map (view, layers, selection) moves there and back.
 */
const PropertyMap = ({ onAdd, isAdded }: PropertyMapProps) => {
  const { t } = useTranslation('map');
  const [location, setLocation] = useState<MapLocation | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<SelectedFeature[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [large, setLarge] = useState(false);

  // A row that disappears with a new selection never reports leaving, so the highlight goes with it.
  const changeSelection = (features: SelectedFeature[]) => {
    setSelectedFeatures(features);
    setHighlightedId(null);
  };

  // Owned here, not by OrigoMap, so the page and the modal show the same map.
  const map = useOrigoMap({
    onLocationChange: setLocation,
    onSelectionChange: changeSelection,
    highlightedId,
    onHoverChange: setHighlightedId,
  });

  // Rendered either inline or in the modal. Only the map's height differs, so the location and the
  // table stay in the normal flow below it.
  const content = (
    <>
      <OrigoMap map={map} className={`h-[70vh] ${large ? 'max-h-[120rem]' : 'max-h-[60rem]'}`} />
      {location && <SelectedLocation location={location} />}
      <PropertyTable
        features={selectedFeatures}
        highlightedId={highlightedId}
        onHighlight={setHighlightedId}
        onAdd={onAdd}
        isAdded={isAdded}
      />
    </>
  );

  return (
    <>
      <div className="mb-12">
        <Button onClick={() => setLarge(true)}>{t('open_large_map')}</Button>
      </div>
      {large ? (
        <Modal
          show
          onClose={() => setLarge(false)}
          label={t('large_map_label')}
          className="w-[160rem] h-[120rem] max-w-[80vw] max-h-[90vh] overflow-y-auto"
          data-cy="property-map-modal"
        >
          <Modal.Content>{content}</Modal.Content>
        </Modal>
      ) : (
        content
      )}
    </>
  );
};

export default PropertyMap;
