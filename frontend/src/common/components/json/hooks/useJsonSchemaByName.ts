import { getLatestRjsfSchema, getRjsfSchema, getUiSchemaForSchema } from '@common/components/json/utils/schema-utils';
import type { RJSFSchema, UiSchema } from '@rjsf/utils';
import { useEffect, useState } from 'react';

interface UseJsonSchemaByNameResult {
  schema: RJSFSchema | null;
  uiSchema: UiSchema | null;
  /** The exact version the form is bound to, to be stored with whatever is written through it. */
  schemaId: string | null;
  loading: boolean;
  error: string | null;
  /** The service publishes no schema by that name — nothing to fill in, which is not an error. */
  notFound: boolean;
}

type LoadedSchema = UseJsonSchemaByNameResult & { municipalityId: string; request: string };

const isNotFound = (error: unknown): boolean => (error as { response?: { status?: number } })?.response?.status === 404;

const IDLE: UseJsonSchemaByNameResult = {
  schema: null,
  uiSchema: null,
  schemaId: null,
  loading: false,
  error: null,
  notFound: false,
};

/**
 * Whether what is loaded answers the request. A schema loaded as the latest of its name also answers
 * a request bound to the version it resolved to: the first save binds the document to that version,
 * which must not reload the schema and remount the form.
 */
const answers = (loaded: LoadedSchema | null, municipalityId: string, request: string, boundSchemaId?: string) =>
  !!loaded &&
  loaded.municipalityId === municipalityId &&
  (loaded.request === request || (!!boundSchemaId && loaded.schemaId === boundSchemaId));

/**
 * Loads a schema by name, or by the exact version an existing document is bound to — so answers
 * keep rendering as filed after a newer version is published.
 */
export function useJsonSchemaByName(
  municipalityId: string,
  schemaName: string | undefined,
  boundSchemaId?: string
): UseJsonSchemaByNameResult {
  const [loaded, setLoaded] = useState<LoadedSchema | null>(null);
  const request = `${municipalityId}:${boundSchemaId ?? schemaName ?? ''}`;
  const isLoaded = answers(loaded, municipalityId, request, boundSchemaId);

  useEffect(() => {
    if (!municipalityId || !schemaName || isLoaded) return;

    let active = true;

    (async () => {
      try {
        const { schema, schemaId } = boundSchemaId
          ? { schema: await getRjsfSchema(municipalityId, boundSchemaId), schemaId: boundSchemaId }
          : await getLatestRjsfSchema(municipalityId, schemaName);

        const uiSchema = await getUiSchemaForSchema(municipalityId, schemaId).catch(() => null);

        if (!active) return;
        setLoaded({ ...IDLE, municipalityId, request, schema, uiSchema, schemaId });
      } catch (e) {
        if (!active) return;
        if (isNotFound(e)) {
          setLoaded({ ...IDLE, municipalityId, request, notFound: true });
          return;
        }
        console.error('Failed to load schema:', boundSchemaId ?? schemaName, e);
        setLoaded({
          ...IDLE,
          municipalityId,
          request,
          error: `Kunde inte hämta schemat ${boundSchemaId ?? schemaName}`,
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [municipalityId, schemaName, boundSchemaId, request, isLoaded]);

  if (!municipalityId || !schemaName) return IDLE;
  if (!isLoaded) return { ...IDLE, loading: true };

  return loaded!;
}
