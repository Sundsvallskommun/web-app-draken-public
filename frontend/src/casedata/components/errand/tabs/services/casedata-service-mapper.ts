import type { Asset } from '@casedata/interfaces/asset';
import { enumTitlesOfArray } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';

export interface Service {
  id: string;
  restyp: string[];
  aids: string[];
  addon: string[];
  transportMode: string[];
  comment: string;
  isWinterService: boolean;
  issued?: string;
  validTo?: string;
  schemaVersion?: string;
}

function normalizeArray(values: any): string[] {
  if (Array.isArray(values)) {
    if (values.length > 0 && typeof values[0] === 'object') {
      return values.map((x: any) => x?.value ?? x?.key).filter(Boolean);
    }
    return values;
  }
  return [];
}

export function mapFormToServiceFromPayload(fd: any, schema: RJSFSchema | null, id: string): Service {
  const mobilityIds = normalizeArray(fd?.mobilityAids);
  const addonIds = normalizeArray(fd?.additionalAids);
  const transportModeIds = normalizeArray(fd?.transportMode);
  const typeIds = Array.isArray(fd?.type) ? fd.type : fd?.type ? [fd.type] : [];
  const isWinterService = fd?.isWinterService === 'ja' || fd?.isWinterService === true;

  return {
    id,
    restyp: enumTitlesOfArray(schema, 'type', typeIds),
    aids: enumTitlesOfArray(schema, 'mobilityAids', mobilityIds),
    addon: enumTitlesOfArray(schema, 'additionalAids', addonIds),
    transportMode: enumTitlesOfArray(schema, 'transportMode', transportModeIds),
    comment: typeof fd?.notes === 'string' ? fd.notes : '',
    isWinterService,
  };
}

export function extractFormDataFromAsset(asset: Asset, schemaId: string): any | null {
  const jp = asset.jsonParameters?.find((p) => p.schemaId === schemaId) ?? asset.jsonParameters?.[0];
  if (!jp?.value) return null;
  try {
    return typeof jp.value === 'string' ? JSON.parse(jp.value) : jp.value;
  } catch {
    return null;
  }
}

export function assetToService(asset: Asset, schema: RJSFSchema | null, schemaId: string): Service | null {
  const fd = extractFormDataFromAsset(asset, schemaId);
  if (!fd) return null;
  return mapFormToServiceFromPayload(fd, schema, asset.id);
}
