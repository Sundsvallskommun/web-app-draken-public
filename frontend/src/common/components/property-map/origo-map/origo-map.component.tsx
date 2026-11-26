'use client';

import { Button } from '@sk-web-gui/react';
import { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { OrigoMapHandle } from './use-origo-map';

interface OrigoMapProps {
  /** The map from `useOrigoMap`, called by the component that owns it. */
  map: OrigoMapHandle;
  /** Size of the map box; the map has no height of its own. */
  className: string;
}

/**
 * Shows a map built by `useOrigoMap`. The map's element is moved in here while this is mounted and
 * out again on unmount, so the same map can be shown in different places (e.g. a page and a modal).
 */
const OrigoMap = ({ map, className }: OrigoMapProps) => {
  const { t } = useTranslation('map');
  const { element, loading, hasUserPosition, outsideMunicipality, goToUserPosition } = map;
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot || !element) return undefined;
    slot.appendChild(element);
    return () => {
      if (element.parentNode === slot) slot.removeChild(element);
    };
  }, [element]);

  return (
    <div>
      <div className={`relative w-full overflow-hidden rounded-lg ${className}`}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background-200">
            <p className="text-dark-secondary">{t('loading')}</p>
          </div>
        )}
        <div ref={slotRef} className="h-full w-full" />
      </div>

      <div aria-live="polite">
        {outsideMunicipality && (
          <p
            role="alert"
            className="rounded-lg border border-error bg-error-background-200 text-error px-12 py-8 text-small"
          >
            {t('error_outside_municipality')}
          </p>
        )}
      </div>

      {hasUserPosition && (
        <div className="flex flex-wrap items-center gap-12">
          <Button variant="tertiary" size="sm" onClick={goToUserPosition}>
            {t('use_my_position')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrigoMap;
