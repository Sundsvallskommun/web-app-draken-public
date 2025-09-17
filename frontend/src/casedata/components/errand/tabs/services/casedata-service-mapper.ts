import { Service } from './casedata-service-item.component';
import { serviceModeOfTransportation, travelTypeKeyMap } from './service';

export const SCHEMA_KEY = 'FTErrandAssets';
export const SCHEMA_ID = '2281_fterrandassets_1.0';

const transportKeyMap = Object.fromEntries(serviceModeOfTransportation.map((t) => [t.value, t.key]));
export const toDateOnly = (d?: string) => (!d ? undefined : d.slice(0, 10));

function stampRoot<T extends { created?: string; modified?: string }>(
  next: Omit<T, 'created' | 'modified'>,
  prevJson?: string
): T {
  const now = new Date().toISOString();
  let prev: Partial<T> | undefined;
  if (prevJson) {
    try {
      prev = JSON.parse(prevJson) as Partial<T>;
    } catch {}
  }
  return { ...(next as any), created: prev?.created ?? now, modified: now } as T;
}

function buildSchemaValue(service: Service) {
  return {
    period: service.validityType === 'tillsvidare' ? 'Tillsvidare' : 'Tidsbegränsad',
    type: travelTypeKeyMap[service.restyp] ?? service.restyp ?? '',
    validFrom: toDateOnly(service.startDate),
    validTo: service.validityType === 'tidsbegransad' ? toDateOnly(service.endDate) : null,
    winter: service.winter ?? false,
    carTypes: [
      {
        key: transportKeyMap[service.transport] ?? 'USER_SELECTED',
        value: service.transport ?? '',
        approved: null,
      },
    ],
    mobilityAids: (service.aids ?? []).map((aid) => ({
      key: aid.key,
      value: aid.value,
      approved: aid.approved ?? null,
      standard: aid.standard ?? false,
    })),
    additionalAids: (service.addon ?? []).map((addon) => ({
      key: addon.key,
      value: addon.value,
      approved: addon.approved ?? null,
      standard: addon.standard ?? false,
    })),
    notes: service.comment ? [{ key: 'driverInstructions', value: service.comment }] : null,
  };
}

export const mapServiceToJsonParameter = (service: Service, opts?: { prevValue?: string }) => {
  const base = buildSchemaValue(service);
  const stamped = stampRoot(base, opts?.prevValue);
  return {
    key: SCHEMA_KEY,
    schemaId: SCHEMA_ID,
    value: JSON.stringify(stamped),
  };
};
