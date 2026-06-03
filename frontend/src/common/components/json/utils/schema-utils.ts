import {
  getLatestSchema,
  getSchema,
  getUiSchema,
  JsonSchemaResponse,
  UiSchemaResponse,
} from '@common/services/jsonschema-service';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

type LatestSchemaResult = { schema: RJSFSchema; schemaId: string; name: string; version: string };

const schemaCache = new Map<string, Promise<RJSFSchema>>();
const latestSchemaCache = new Map<string, Promise<LatestSchemaResult>>();
const uiSchemaCache = new Map<string, Promise<UiSchema>>();

function unwrap<T>(response: { data?: T } | T): T {
  return (response as { data?: T })?.data ?? (response as T);
}

function cached<T>(cache: Map<string, Promise<T>>, key: string, loader: () => Promise<T>): Promise<T> {
  const existing = cache.get(key);
  if (existing !== undefined) return existing;

  const promise = loader().catch((e) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, promise);
  return promise;
}

export function enumTitleOf(schema: RJSFSchema | null, field: string, value: string): string {
  if (!schema || !value) return value ?? '';
  const oneOf = (schema as any)?.properties?.[field]?.oneOf as Array<{ const: string; title?: string }> | undefined;
  return oneOf?.find((o) => o.const === value)?.title ?? value;
}

export function enumTitlesOfArray(schema: RJSFSchema | null, field: string, values: string[] = []): string[] {
  if (!schema) return values ?? [];
  const oneOf = (schema as any)?.properties?.[field]?.items?.oneOf as
    | Array<{ const: string; title?: string }>
    | undefined;
  if (!oneOf) return values ?? [];
  return (values ?? []).map((v) => oneOf.find((o) => o.const === v)?.title ?? v);
}

export async function getRjsfSchema(municipalityId: string, schemaId: string): Promise<RJSFSchema> {
  return cached(schemaCache, `${municipalityId}:${schemaId}`, async () => {
    const resp = await getSchema(municipalityId, schemaId);
    const payload = unwrap<JsonSchemaResponse>(resp);
    return payload.value;
  });
}

export async function getLatestRjsfSchema(municipalityId: string, schemaName: string): Promise<LatestSchemaResult> {
  return cached(latestSchemaCache, `${municipalityId}:${schemaName}`, async () => {
    const resp = await getLatestSchema(municipalityId, schemaName);
    const payload = unwrap<JsonSchemaResponse>(resp);

    return {
      schema: payload.value,
      schemaId: payload.id,
      name: payload.name,
      version: payload.version,
    };
  });
}

export async function getUiSchemaForSchema(municipalityId: string, schemaId: string): Promise<UiSchema> {
  return cached(uiSchemaCache, `${municipalityId}:${schemaId}`, async () => {
    const resp = await getUiSchema(municipalityId, schemaId);
    const payload = unwrap<UiSchemaResponse>(resp);
    return payload.value;
  });
}
