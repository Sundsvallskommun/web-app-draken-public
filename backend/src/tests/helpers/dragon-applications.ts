import type { DragonId } from '@/config/dragon-build';
import { application as aot } from '@/dragons/aot/application';
import { application as bou } from '@/dragons/bou/application';
import { application as iaf } from '@/dragons/iaf/application';
import { application as ik } from '@/dragons/ik/application';
import { application as ka } from '@/dragons/ka/application';
import { application as kc } from '@/dragons/kc/application';
import { application as lok } from '@/dragons/lok/application';
import { application as lop } from '@/dragons/lop/application';
import { application as mex } from '@/dragons/mex/application';
import { application as msva } from '@/dragons/msva/application';
import { application as pt } from '@/dragons/pt/application';
import { application as rob } from '@/dragons/rob/application';
import { application as se } from '@/dragons/se/application';
import { application as vof } from '@/dragons/vof/application';
import type { DragonApplication } from '@/shell/dragon-application';

export const APPLICATIONS: Readonly<Record<DragonId, DragonApplication>> = {
  KC: kc,
  KA: ka,
  MEX: mex,
  PT: pt,
  ROB: rob,
  LOP: lop,
  IK: ik,
  MSVA: msva,
  SE: se,
  BOU: bou,
  LOK: lok,
  IAF: iaf,
  VOF: vof,
  AOT: aot,
};
