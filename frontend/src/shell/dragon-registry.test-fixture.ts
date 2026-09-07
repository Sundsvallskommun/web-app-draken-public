import { aotDragon } from '@dragons/aot';
import { bouDragon } from '@dragons/bou';
import type { DragonId, DragonModule } from '@dragons/dragon-module';
import { iafDragon } from '@dragons/iaf';
import { ikDragon } from '@dragons/ik';
import { kaDragon } from '@dragons/ka';
import { kcDragon } from '@dragons/kc';
import { lokDragon } from '@dragons/lok';
import { lopDragon } from '@dragons/lop';
import { mexDragon } from '@dragons/mex';
import { msvaDragon } from '@dragons/msva';
import { ptDragon } from '@dragons/pt';
import { robDragon } from '@dragons/rob';
import { seDragon } from '@dragons/se';
import { vofDragon } from '@dragons/vof';

/** Test inventory. Production imports only the selected dragon through @dragon. */
export const DRAGON_REGISTRY: Readonly<Record<DragonId, DragonModule>> = Object.freeze({
  KC: kcDragon,
  KA: kaDragon,
  MEX: mexDragon,
  PT: ptDragon,
  ROB: robDragon,
  LOP: lopDragon,
  IK: ikDragon,
  MSVA: msvaDragon,
  SE: seDragon,
  BOU: bouDragon,
  LOK: lokDragon,
  IAF: iafDragon,
  VOF: vofDragon,
  AOT: aotDragon,
});
