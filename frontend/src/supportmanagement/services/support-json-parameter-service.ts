import { getLatestSchema } from '@common/services/jsonschema-service';

import { isRecord } from './support-form-value-service';

export type JsonObject = Record<string, unknown>;

/** A JSON parameter as the BFF answers it; the generated contract types the value as Jackson's JsonNode. */
export interface SupportJsonParameter {
  key: string;
  schemaId: string;
  value: unknown;
  version?: number;
}

/** What a JSON parameter is written with. */
export interface SupportJsonParameterWrite {
  schemaId: string;
  value: JsonObject;
}

/**
 * The schema version to write an entry with, the entry being filed under its schema's name: the one it was first
 * saved with, or the latest when this is its first save.
 */
export const jsonParameterSchemaId = async (
  parameters: SupportJsonParameter[] | undefined,
  municipalityId: string,
  schemaName: string
): Promise<string> =>
  parameters?.find(({ key }) => key === schemaName)?.schemaId ??
  (await getLatestSchema(municipalityId, schemaName)).data.id;

/** The object filed under the key; undefined when there is none. */
export const jsonParameterObject = (
  parameters: SupportJsonParameter[] | undefined,
  key: string
): JsonObject | undefined => {
  const value = parameters?.find((parameter) => parameter.key === key)?.value;
  return isRecord(value) ? value : undefined;
};

/** The object under a JSON value, or an empty one. */
export const objectAt = (value: unknown): JsonObject => (isRecord(value) ? value : {});

/** The string a JSON value holds, if it is one. */
export const stringAt = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

// A list is kept even when empty: an empty list is an answer, such as no beverages decided.
const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || value === '' || (isRecord(value) && Object.keys(value).length === 0);

/** Leaves out what has no value, at every level: the schemas want a missing value omitted, and '' fails their patterns. */
export const withoutBlanks = (value: JsonObject): JsonObject =>
  Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]): [string, unknown] => [key, isRecord(entry) ? withoutBlanks(entry) : entry])
      .filter(([, entry]) => !isBlank(entry))
  );

const sortedKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortedKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => [key, sortedKeys(value[key])])
  );
};

/** Equal regardless of key order, since the service need not hand the keys back in the order they were written. */
export const sameJson = (a: unknown, b: unknown): boolean =>
  JSON.stringify(sortedKeys(a)) === JSON.stringify(sortedKeys(b));
