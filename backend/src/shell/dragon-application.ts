import type { DragonId } from '@/config/dragon-build';
import type { SupportInvestigationProfile } from '@/config/support-investigation-profile';

/** Concrete server composition owned by one dragon. */
export interface DragonApplication {
  readonly id: DragonId;
  readonly controllers: NewableFunction[];
  readonly investigationProfile?: SupportInvestigationProfile;
}
