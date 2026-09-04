import { aotDragon } from '@dragons/aot';
import { bouDragon } from '@dragons/bou';
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

import type { DragonRegistry } from './compose-dragon';

/**
 * Every dragon module, statically imported. All fourteen ship in every bundle and the shell picks
 * one at runtime from `NEXT_PUBLIC_APPLICATION`; that is what lets entrypoint.sh choose the dragon
 * after the image is built. The modules are small data, so bundling them all costs little.
 *
 * `Record<DragonId, ...>` makes a forgotten registration a type error.
 */
export const DRAGON_REGISTRY: DragonRegistry = Object.freeze({
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
