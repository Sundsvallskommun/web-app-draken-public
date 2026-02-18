import {
  getLatestSchema,
  getSchema,
  getUiSchema,
  JsonSchemaResponse,
  UiSchemaResponse,
} from '@casedata/services/asset-service';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';

function unwrap<T>(response: { data?: T } | T): T {
  return (response as { data?: T })?.data ?? (response as T);
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
  const resp = await getSchema(municipalityId, schemaId);
  const payload = unwrap<JsonSchemaResponse>(resp);
  return payload.value;
}

export async function getLatestRjsfSchema(
  municipalityId: string,
  schemaName: string
): Promise<{ schema: RJSFSchema; schemaId: string; name: string; version: string }> {
  const resp = await getLatestSchema(municipalityId, schemaName);
  const payload = unwrap<JsonSchemaResponse>(resp);

  return {
    schema: payload.value,
    schemaId: payload.id,
    name: payload.name,
    version: payload.version,
  };
}

export async function getUiSchemaForSchema(municipalityId: string, schemaId: string): Promise<UiSchema> {
  const resp = await getUiSchema(municipalityId, schemaId);
  const payload = unwrap<UiSchemaResponse>(resp);
  return payload.value;
}
