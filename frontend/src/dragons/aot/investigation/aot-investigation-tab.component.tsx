'use client';

import type { FC } from 'react';

/**
 * Placeholder. AOT's utredning is not built yet; this exists so the variant slot has something to
 * render and so the seam can be exercised end to end with a second implementation.
 */
export const AotInvestigationTab: FC = () => (
  <div className="p-24" data-cy="aot-investigation-tab">
    <h2 className="text-h2-md mb-16">Utredning</h2>
    <p>Utredningen för den här verksamheten är under utveckling och är ännu inte tillgänglig.</p>
  </div>
);
