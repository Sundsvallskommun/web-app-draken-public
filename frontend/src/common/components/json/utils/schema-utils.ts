import { getLatestMetadataSchema, getMetadataSchema } from '@casedata/services/asset-service';
import type { RJSFSchema } from '@rjsf/utils';

type MetaPayload = {
  id?: string;
  name?: string;
  version?: string;
  value?: string;
  schema?: unknown;
  data?: unknown;
};

function unwrap<T = any>(x: any): T {
  return (x?.data ?? x) as T;
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

export function normalizeToRJSFSchema(input: unknown): RJSFSchema {
  const unwrap = (x: any) => (x?.data ?? x) as any;

  const payload = unwrap(input);

  if (payload?.schema && typeof payload.schema === 'object') {
    return payload.schema as RJSFSchema;
  }

  if (typeof payload?.value === 'string') {
    try {
      return JSON.parse(payload.value) as RJSFSchema;
    } catch (e) {
      throw new Error('Ogiltig JSON i schema.value');
    }
  }

  if (payload && typeof payload === 'object') {
    return payload as RJSFSchema;
  }

  throw new Error('Okänt schemaformat från backend');
}

export async function getRjsfSchema(schemaId: string): Promise<RJSFSchema> {
  const resp = await getMetadataSchema(schemaId);
  return normalizeToRJSFSchema(resp);
}

export async function getLatestRjsfSchema(
  schemaName: string
): Promise<{ schema: RJSFSchema; schemaId: string; name?: string; version?: string }> {
  const resp = await getLatestMetadataSchema(schemaName);
  const meta = unwrap<MetaPayload>(resp);
  const schema = normalizeToRJSFSchema(meta);
  const schemaId = meta.id ?? '';
  if (!schemaId) throw new Error('Cannot get schemaId from latest schema');

  return { schema, schemaId, name: meta.name, version: meta.version };
}
