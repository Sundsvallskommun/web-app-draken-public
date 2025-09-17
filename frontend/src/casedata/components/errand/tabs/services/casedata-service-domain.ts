import { Asset } from '@casedata/interfaces/asset';
import { IErrand } from '@casedata/interfaces/errand';
import { Role } from '@casedata/interfaces/role';
import { createAsset, getAssets, updateAsset } from '@casedata/services/asset-service';
import { Service } from './casedata-service-item.component';
import { mapServiceToJsonParameter, SCHEMA_KEY, toDateOnly } from './casedata-service-mapper';
import { transportValueMap, travelTypeValueMap } from './service';

const findExistingAsset = async (errand: IErrand): Promise<Asset | undefined> => {
  const partyId = errand.stakeholders?.find((s) => s.roles.includes(Role.APPLICANT))?.personId;
  if (!partyId) return undefined;

  const res = await getAssets({
    partyId,
    type: 'PERMIT',
  });
  const assets = res?.data ?? [];

  const byAssetId = assets.find((a) => a.assetId === errand.errandNumber);
  if (byAssetId) return byAssetId;

  const byCaseRef = assets.find(
    (a) => Array.isArray(a.caseReferenceIds) && a.caseReferenceIds.includes(String(errand.id))
  );
  return byCaseRef;
};

const touchParamTimestamps = (jp: any, prev?: any) => {
  const now = new Date().toISOString();
  return { ...jp, created: prev?.created ?? now, modified: now };
};

function getIdxFromCompositeId(serviceId: string, assetUuid: string): number | null {
  const prefix = `${assetUuid}:`;
  if (!serviceId?.startsWith(prefix)) return null;
  const num = Number(serviceId.slice(prefix.length));
  return Number.isInteger(num) ? num : null;
}

function normalizeForCompare(v: any) {
  const { created, modified, ...rest } = v ?? {};
  if (rest.notes == null) rest.notes = [];
  if (rest.validTo === undefined) rest.validTo = null;
  return rest;
}

const isSameSchemaValue = (nextValObj: any, prevValObj: any) =>
  JSON.stringify(normalizeForCompare(nextValObj)) === JSON.stringify(normalizeForCompare(prevValObj));

const buildCreatePayload = (errand: IErrand, services: Service[]) => {
  const partyId = errand.stakeholders?.find((s) => s.roles.includes(Role.APPLICANT))?.personId!;
  const baseJsonParameters = services.map((s) => mapServiceToJsonParameter(s)); // mappern stämplar root.created/modified

  const starts = services.map((s) => toDateOnly(s.startDate)).filter(Boolean) as string[];
  const ends = services
    .map((s) => (s.validityType === 'tidsbegransad' ? toDateOnly(s.endDate) : undefined))
    .filter(Boolean) as string[];

  const issued = starts.length ? starts.sort()[0] : toDateOnly(new Date().toISOString());
  const validTo = ends.length ? ends.sort()[ends.length - 1] : undefined;

  const now = new Date().toISOString();

  return {
    assetId: errand.errandNumber,
    partyId,
    origin: 'CASEDATA',
    type: 'PERMIT',
    status: 'ACTIVE',
    issued,
    validTo,
    description: '',
    caseReferenceIds: errand?.id ? [String(errand.id)] : undefined,
    jsonParameters: baseJsonParameters.map((jp) => touchParamTimestamps(jp)),
    created: now,
    modified: now,
  };
};

const buildPatchPayload = (existing: Asset, errand: IErrand, services: Service[]) => {
  const prevParams = existing.jsonParameters ?? [];
  const nextParams = [...prevParams];

  for (const s of services) {
    let prevParam: any | undefined;
    let prevValueObj: any | undefined;
    let targetIndex: number | null = null;

    const idx = getIdxFromCompositeId(s.id, existing.id);
    if (idx !== null && prevParams[idx]?.key === SCHEMA_KEY && typeof prevParams[idx].value === 'string') {
      prevParam = prevParams[idx];
      targetIndex = idx;
      try {
        prevValueObj = JSON.parse(prevParam.value);
      } catch {
        prevValueObj = undefined;
      }
    }

    const candidateParam = mapServiceToJsonParameter(s, { prevValue: prevParam?.value });

    let hasChanged = true;
    if (prevValueObj) {
      try {
        const nextValueObj = JSON.parse(candidateParam.value);
        hasChanged = !isSameSchemaValue(nextValueObj, prevValueObj);
      } catch {
        hasChanged = true;
      }
    }

    if (targetIndex !== null && prevParam && !hasChanged) {
      nextParams[targetIndex] = prevParam;
    } else if (targetIndex !== null && prevParam && hasChanged) {
      nextParams[targetIndex] = touchParamTimestamps(candidateParam, prevParam);
    } else {
      nextParams.push(touchParamTimestamps(candidateParam));
    }
  }

  const ends = services
    .map((s) => (s.validityType === 'tidsbegransad' ? toDateOnly(s.endDate) : undefined))
    .filter(Boolean) as string[];
  const validTo = ends.length ? ends.sort()[ends.length - 1] : null;

  return {
    caseReferenceIds: Array.from(
      new Set([...(existing.caseReferenceIds ?? []), ...(errand?.id ? [String(errand.id)] : [])])
    ),
    validTo,
    status: existing.status ?? 'ACTIVE',
    statusReason: existing.statusReason ?? undefined,
    additionalParameters: existing.additionalParameters ?? undefined,
    jsonParameters: nextParams,
  };
};

export const saveOrUpdateServicesToBackend = async (errand: IErrand): Promise<Asset | undefined> => {
  const services: Service[] = errand.services ?? [];
  if (services.length === 0) return;

  const municipalityId = String(errand.municipalityId ?? 2281);
  const existing = await findExistingAsset(errand);

  if (!existing) {
    const payload = buildCreatePayload(errand, services);
    const createdResp = await createAsset(municipalityId, payload as any);
    return createdResp?.data;
  }

  const patchPayload = buildPatchPayload(existing, errand, services);
  const updatedResp = await updateAsset(municipalityId, existing.id, patchPayload);
  return updatedResp?.data;
};

export const getServicesFromBackend = async (errand: IErrand): Promise<Service[]> => {
  const partyId = errand.stakeholders?.find((s) => s.roles.includes(Role.APPLICANT))?.personId;
  if (!partyId) return [];

  const res = await getAssets({
    partyId,
    type: 'PERMIT',
    assetId: errand.errandNumber,
  });
  const assets = (res?.data ?? []) as any[];
  const out: Service[] = [];

  for (const asset of assets) {
    if (asset.origin !== 'CASEDATA') continue;

    if (Array.isArray(asset.jsonParameters)) {
      for (let idx = 0; idx < asset.jsonParameters.length; idx++) {
        const jp = asset.jsonParameters[idx];
        if (jp?.key !== SCHEMA_KEY || typeof jp?.value !== 'string') continue;

        try {
          const parsed = JSON.parse(jp.value);
          const typeLabel = travelTypeValueMap[parsed.type] ?? parsed.type ?? asset.type ?? '';
          const rawTransport = parsed.carTypes?.[0]?.value;
          const transportLabel = transportValueMap[rawTransport] ?? rawTransport ?? '';

          out.push({
            id: `${asset.id}:${idx}`,
            restyp: typeLabel,
            transport: transportLabel,
            aids: Array.isArray(parsed.mobilityAids) ? parsed.mobilityAids : [],
            addon: Array.isArray(parsed.additionalAids) ? parsed.additionalAids : [],
            winter: parsed.winter ?? false,
            comment: parsed.notes?.[0]?.value ?? '',
            startDate: parsed.validFrom ?? '',
            endDate: parsed.validTo ?? '',
            validityType: parsed.period === 'Tillsvidare' ? 'tillsvidare' : 'tidsbegransad',
          });
        } catch (e) {
          console.warn('Kunde inte parsa jsonParameters-post:', jp, e);
        }
      }
    }
  }

  return out;
};
