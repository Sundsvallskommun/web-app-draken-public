import type { Asset } from '@casedata/interfaces/asset';
import { enumTitleOf, enumTitlesOfArray } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema } from '@rjsf/utils';

export interface Service {
  id: string;
  restyp: string;
  transport: string;
  aids: string[];
  addon: string[];
  winter: boolean;
  comment: string;
  startDate: string;
  endDate: string;
  validityType: 'tidsbegransad' | 'tillsvidare';
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
  const validityType: Service['validityType'] = fd?.validityType === 'tillsvidare' ? 'tillsvidare' : 'tidsbegransad';
  const mobilityIds = normalizeArray(fd?.mobilityAids);
  const addonIds = normalizeArray(fd?.additionalAids);

  return {
    id,
    restyp: enumTitleOf(schema, 'type', fd?.type ?? ''),
    transport: enumTitleOf(schema, 'cartype', fd?.cartype ?? ''),
    aids: enumTitlesOfArray(schema, 'mobilityAids', mobilityIds),
    addon: enumTitlesOfArray(schema, 'additionalAids', addonIds),
    comment: typeof fd?.notes === 'string' ? fd.notes : '',
    startDate: fd?.validFrom ?? '',
    endDate: validityType === 'tillsvidare' ? '' : fd?.validTo ?? '',
    validityType,
    winter: !!fd?.winter,
  };
}

export function extractFormDataFromAsset(asset: Asset, schemaId: string): any | null {
  const jp = asset.jsonParameters?.find((p) => p.schemaId === schemaId) ?? asset.jsonParameters?.[0];
  if (!jp?.value) return null;
  try {
    return JSON.parse(jp.value);
  } catch {
    return null;
  }
}

export function assetToService(asset: Asset, schema: RJSFSchema | null, schemaId: string): Service | null {
  const fd = extractFormDataFromAsset(asset, schemaId);
  if (!fd) return null;
  return mapFormToServiceFromPayload(fd, schema, asset.id);
}
