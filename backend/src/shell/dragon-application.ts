import type { DragonId } from '@/config/dragon-build';
import type { SupportApplicationProfile } from '@/config/support-application-profile';

/** Concrete server composition owned by one dragon. */
export interface DragonApplication {
  readonly id: DragonId;
  readonly controllers: NewableFunction[];
  readonly supportProfile?: SupportApplicationProfile;
}
