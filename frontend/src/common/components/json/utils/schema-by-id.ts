import type { RJSFSchema } from '@rjsf/utils';

/** Stands in for an array row's number, which is only known once the row is rendered. */
const ROW_INDEX_PLACEHOLDER = '#';

/**
 * Sub-schemas keyed the way RJSF builds field ids (`${parentId}_${propertyName}`). Built rather
 * than parsed back, because a property name may itself contain the separator.
 */
export function collectSchemasById(
  schema: RJSFSchema,
  id = 'root',
  collected: Record<string, RJSFSchema> = {}
): Record<string, RJSFSchema> {
  collected[id] = schema;
  const properties = schema.properties as Record<string, RJSFSchema> | undefined;

  for (const [name, child] of Object.entries(properties ?? {})) {
    const childId = `${id}_${name}`;
    if (child.type === 'object') collectSchemasById(child, childId, collected);

    // Every row renders from the same item schema, but RJSF numbers the rows in the id.
    const items = child.items as RJSFSchema | undefined;
    if (child.type === 'array' && items?.type === 'object') {
      collectSchemasById(items, `${childId}_${ROW_INDEX_PLACEHOLDER}`, collected);
    }
  }

  return collected;
}

/**
 * The sub-schema an object is judged by. Falling back to the root schema would be worse than
 * having none: a nested field sharing its name with a conditional question at the root would be
 * judged by that question's condition, against the wrong data slice, and silently disappear.
 */
export function schemaForObject(
  schemaById: Record<string, RJSFSchema> | undefined,
  id: string,
  rootSchema?: RJSFSchema,
  isRoot = false
): RJSFSchema | undefined {
  const rowAgnosticId = id.replace(/_\d+(?=_|$)/g, `_${ROW_INDEX_PLACEHOLDER}`);
  return schemaById?.[id] ?? schemaById?.[rowAgnosticId] ?? (isRoot ? rootSchema : undefined);
}
