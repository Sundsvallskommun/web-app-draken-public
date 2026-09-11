'use client';

import { usePathname } from 'next/navigation';

import { ConstructionWorker } from './construction-worker.component';
import { FrankensteinMonster } from './frankenstein-monster.component';

/**
 * Temporary site-wide notice that Draken is being rebuilt. Rendered above everything else in
 * the app shell so it is the first thing on every page, for every drake.
 *
 * The builder stands in the banner everywhere; the monster joins him only on an errand.
 * Path matching mirrors Layout's own `includes('arende')` check.
 */
export const UnderConstructionBanner = () => {
  const pathName = usePathname() ?? '';
  const isErrandView = pathName.includes('arende');

  return (
    <div
      role="status"
      aria-live="polite"
      data-cy="under-construction-banner"
      className="under-construction-banner relative flex w-full items-center overflow-hidden px-16 py-12 md:px-[112px]"
    >
      {isErrandView && <FrankensteinMonster />}
      <div className="under-construction-banner-text mx-auto flex w-full max-w-content flex-col items-center gap-4 rounded-groups border-2 border-solid border-[#1a1a1a] px-24 py-12 text-center">
        <span className="text-h3-md font-bold uppercase tracking-[0.1em]">🚧 Under uppbyggnad! 🚧</span>
        <span className="text-base font-bold">Texter är inte korrekta och felmeddelanden kan dyka upp!</span>
      </div>
      <ConstructionWorker />
    </div>
  );
};
