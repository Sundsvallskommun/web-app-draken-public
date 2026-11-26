'use client';

import { MapPin } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import type { MapLocation } from './origo-map/origo.types';
import { PROJECTION } from './origo-map/origo-config';

const meters = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 });
const degrees = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 6, maximumFractionDigits: 6 });

/** The point picked in the map, in the map projection (northing/easting) and WGS 84. */
const SelectedLocation = ({
  location: {
    xy: [x, y],
    lat,
    lon,
  },
}: {
  location: MapLocation;
}) => {
  const { t } = useTranslation('map');
  const headingId = useId();

  // One row: heading, then each label next to its value; wraps by pair on narrow screens.
  return (
    <section
      className="flex flex-wrap items-center gap-x-16 gap-y-4 rounded-12 border-1 border-divider bg-background-100 px-16 py-8 text-small"
      aria-labelledby={headingId}
    >
      <span className="flex items-center gap-8">
        <MapPin size={16} className="shrink-0 text-dark-secondary" aria-hidden />
        <h3 id={headingId} className="text-label-medium">
          {t('location_heading')}
        </h3>
      </span>
      <dl className="flex flex-wrap items-center gap-x-16 gap-y-4 m-0">
        <div className="flex flex-wrap gap-x-8 [&>*]:whitespace-nowrap">
          <dt className="text-dark-secondary">{PROJECTION.label}</dt>
          <dd className="m-0 tabular-nums">
            N {meters.format(y)}, E {meters.format(x)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-8 [&>*]:whitespace-nowrap">
          <dt className="text-dark-secondary">{t('location_wgs84')}</dt>
          <dd className="m-0 tabular-nums">
            {degrees.format(lat)}° N, {degrees.format(lon)}° E
          </dd>
        </div>
      </dl>
    </section>
  );
};

export default SelectedLocation;
