import type { RJSFSchema, UiSchema } from '@rjsf/utils';

interface AutoUiSchemaProperty {
  type?: string | readonly string[];
  format?: string;
  oneOf?: ReadonlyArray<{ const?: unknown }>;
  enum?: readonly unknown[];
  items?: AutoUiSchemaProperty;
  widget?: string;
}

const asProperty = (value: unknown): AutoUiSchemaProperty | undefined =>
  typeof value === 'object' && value !== null ? (value as AutoUiSchemaProperty) : undefined;

const hasType = (property: AutoUiSchemaProperty | undefined, type: string): boolean =>
  typeof property?.type === 'string'
    ? property.type === type
    : Array.isArray(property?.type)
    ? property.type.includes(type)
    : false;

const isOneOfStrings = (property: AutoUiSchemaProperty | undefined): boolean =>
  Array.isArray(property?.oneOf) && property.oneOf.every((option) => typeof option.const === 'string');

const isEnumStrings = (property: AutoUiSchemaProperty | undefined): boolean =>
  Array.isArray(property?.enum) && property.enum.every((value) => typeof value === 'string');

/**
 * Builds the design-system widget defaults used when a schema has no authored UI schema.
 * Explicit schema widgets win, and only the date/time formats override the ordinary string widget.
 */
export function buildUiSchemaFromSchema(schema: RJSFSchema): UiSchema {
  const ui: UiSchema = {};
  const properties = schema.properties ?? {};

  for (const [key, rawProperty] of Object.entries(properties)) {
    const property = asProperty(rawProperty);
    if (!property) continue;

    const entry: UiSchema = {};

    if (property.widget) {
      entry['ui:widget'] = property.widget;
    } else {
      if (hasType(property, 'string')) {
        if (property.format === 'date') entry['ui:widget'] = 'date';
        if (property.format === 'time') entry['ui:widget'] = 'time';
      }

      if (
        hasType(property, 'array') &&
        property.items &&
        (hasType(property.items, 'string') || !property.items.type) &&
        (isOneOfStrings(property.items) || isEnumStrings(property.items))
      ) {
        entry['ui:widget'] = 'ComboboxWidget';
      }

      if (hasType(property, 'string') && (isOneOfStrings(property) || isEnumStrings(property))) {
        entry['ui:widget'] ??= 'select';
      }
      if (hasType(property, 'boolean')) {
        entry['ui:widget'] ??= 'checkbox';
      }
      if (hasType(property, 'string')) {
        entry['ui:widget'] ??= 'TextWidget';
      }
    }

    if (Object.keys(entry).length > 0) ui[key] = entry;
  }

  return ui;
}
