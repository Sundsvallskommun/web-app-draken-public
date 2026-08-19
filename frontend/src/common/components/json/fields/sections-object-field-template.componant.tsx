'use client';

import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import type { ObjectFieldTemplateProps, RJSFSchema, UiSchema } from '@rjsf/utils';
import { Checkbox, Disclosure, Divider, Label } from '@sk-web-gui/react';
import { MouseEvent, ReactNode, useState } from 'react';

interface SchemaCondition {
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, SchemaCondition | boolean>;
  required?: string[];
  contains?: SchemaCondition | boolean;
  allOf?: (SchemaCondition | boolean)[];
  anyOf?: (SchemaCondition | boolean)[];
  oneOf?: (SchemaCondition | boolean)[];
  not?: SchemaCondition | boolean;
}

interface ConditionalRule {
  if: SchemaCondition;
  then: {
    required?: string[];
    properties?: Record<string, unknown | boolean>;
  };
}

interface RowDefinition {
  fields: string[];
  gap?: string;
}

interface SectionDefinition {
  id: string;
  title: string;
  icon?: string;
  fields: string[];
  defaultOpen?: boolean;
}

interface FormContext {
  originalSchema?: RJSFSchema;
  idPrefix?: string;
  externalFields?: Readonly<Record<string, ReactNode>>;
}

const externalFieldPrefix = '$external:';

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function matchesSchemaCondition(condition: SchemaCondition | boolean, value: unknown): boolean {
  if (typeof condition === 'boolean') return condition;

  if (hasOwn(condition, 'const') && !Object.is(value, condition.const)) return false;
  if (condition.enum && !condition.enum.some((enumValue) => Object.is(enumValue, value))) return false;

  if (condition.required) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    if (!condition.required.every((fieldName) => hasOwn(value, fieldName))) return false;
  }

  if (condition.properties) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const recordValue = value as Record<string, unknown>;
    const propertiesMatch = Object.entries(condition.properties).every(([fieldName, fieldCondition]) =>
      hasOwn(recordValue, fieldName) ? matchesSchemaCondition(fieldCondition, recordValue[fieldName]) : true
    );
    if (!propertiesMatch) return false;
  }

  if (condition.contains) {
    if (!Array.isArray(value) || !value.some((item) => matchesSchemaCondition(condition.contains!, item))) return false;
  }

  if (condition.allOf && !condition.allOf.every((part) => matchesSchemaCondition(part, value))) return false;
  if (condition.anyOf && !condition.anyOf.some((part) => matchesSchemaCondition(part, value))) return false;
  if (condition.oneOf && condition.oneOf.filter((part) => matchesSchemaCondition(part, value)).length !== 1)
    return false;
  if (condition.not !== undefined && matchesSchemaCondition(condition.not, value)) return false;

  return true;
}

function isConditionMet(condition: ConditionalRule['if'], formData: Record<string, unknown>): boolean {
  return matchesSchemaCondition(condition, formData);
}

function getConditionalFields(schema: RJSFSchema): Map<string, ConditionalRule['if'][]> {
  const conditionalFields = new Map<string, ConditionalRule['if'][]>();
  const addConditionalField = (fieldName: string, condition: ConditionalRule['if']) => {
    const currentConditions = conditionalFields.get(fieldName) ?? [];
    if (!currentConditions.includes(condition)) {
      conditionalFields.set(fieldName, [...currentConditions, condition]);
    }
  };

  const addRule = (rule: ConditionalRule) => {
    for (const field of rule.then.required ?? []) {
      addConditionalField(field, rule.if);
    }

    for (const field of Object.keys(rule.then.properties ?? {})) {
      addConditionalField(field, rule.if);
    }
  };

  const allOf = schema.allOf as ConditionalRule[] | undefined;
  if (allOf) {
    for (const rule of allOf) {
      if (rule.if && rule.then) {
        addRule(rule);
      }
    }
  }

  const rootIf = schema.if as ConditionalRule['if'] | undefined;
  const rootThen = schema.then as ConditionalRule['then'] | undefined;
  if (rootIf && rootThen) {
    addRule({ if: rootIf, then: rootThen });
  }

  return conditionalFields;
}

function getRowDefinitions(uiSchema: UiSchema | undefined): RowDefinition[] {
  return (uiSchema?.['ui:rows'] ?? []) as RowDefinition[];
}

function getSectionDefinitions(uiSchema: UiSchema | undefined): SectionDefinition[] {
  return (uiSchema?.['ui:sections'] ?? []) as SectionDefinition[];
}

interface SectionDisclosureProps {
  disclosureId: string;
  section: SectionDefinition;
  isReadonly: boolean;
  showCompletionControl: boolean;
  children: ReactNode;
}

function SectionDisclosure({
  disclosureId,
  section,
  isReadonly,
  showCompletionControl,
  children,
}: SectionDisclosureProps) {
  const [open, setOpen] = useState(section.defaultOpen ?? false);
  const [doneMark, setDoneMark] = useState(false);

  const handleDoneMarkChange = () => {
    const newDoneMark = !doneMark;
    setDoneMark(newDoneMark);

    if (newDoneMark) {
      setOpen(false);
    }
  };

  // SK Disclosure toggles on both the header and its nested button. Stop the
  // button click from bubbling so keyboard activation changes state once.
  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((currentOpen) => !currentOpen);
  };

  return (
    <Disclosure
      id={disclosureId}
      variant="alt"
      className="schema-boundary-disclosure w-full min-w-0 max-w-full"
      open={open}
      onToggleOpen={setOpen}
    >
      <Disclosure.Header>
        {section.icon && (
          <Disclosure.Icon
            icon={(() => {
              const DynIcon = iconMap[section.icon as string];
              return DynIcon ? <DynIcon /> : undefined;
            })()}
          />
        )}
        <Disclosure.Title id={`${disclosureId}-title`}>
          <h3>{section.title}</h3>
        </Disclosure.Title>
        {doneMark && (
          <Label inverted rounded color="gronsta">
            Komplett
          </Label>
        )}
        <Disclosure.Button aria-labelledby={`${disclosureId}-title`} onClick={handleButtonClick} />
      </Disclosure.Header>
      <Disclosure.Content>
        {children}
        {!isReadonly && showCompletionControl && (
          <>
            <Divider className="mt-16" />
            <Checkbox className="mt-16" onClick={handleDoneMarkChange} checked={doneMark}>
              Markera avsnittet som komplett
            </Checkbox>
          </>
        )}
      </Disclosure.Content>
    </Disclosure>
  );
}

function resolveFieldOrder(rawOrder: unknown, propertyNames: string[]): string[] {
  if (!Array.isArray(rawOrder) || rawOrder.length === 0) {
    return propertyNames;
  }

  const requestedOrder = rawOrder.filter((entry): entry is string => typeof entry === 'string');
  const remainingForWildcard = propertyNames.filter((name) => !requestedOrder.includes(name));
  const resolvedOrder: string[] = [];
  const used = new Set<string>();

  for (const token of requestedOrder) {
    if (token === '*') {
      for (const name of remainingForWildcard) {
        if (!used.has(name)) {
          resolvedOrder.push(name);
          used.add(name);
        }
      }
      continue;
    }

    if (propertyNames.includes(token) && !used.has(token)) {
      resolvedOrder.push(token);
      used.add(token);
    }
  }

  for (const name of propertyNames) {
    if (!used.has(name)) {
      resolvedOrder.push(name);
      used.add(name);
    }
  }

  return resolvedOrder;
}

function insertExternalFieldsInSectionOrder(
  orderedPropertyNames: readonly string[],
  sectionFieldNames: readonly string[]
): string[] {
  const sectionFields = new Set(sectionFieldNames);
  const resolvedOrder = orderedPropertyNames.filter((fieldName) => sectionFields.has(fieldName));

  for (const fieldName of sectionFieldNames) {
    if (!fieldName.startsWith(externalFieldPrefix) || resolvedOrder.includes(fieldName)) continue;

    const declaredIndex = sectionFieldNames.indexOf(fieldName);
    const precedingField = sectionFieldNames
      .slice(0, declaredIndex)
      .reverse()
      .find((candidate) => resolvedOrder.includes(candidate));
    const followingField = sectionFieldNames
      .slice(declaredIndex + 1)
      .find((candidate) => resolvedOrder.includes(candidate));

    if (precedingField) {
      resolvedOrder.splice(resolvedOrder.lastIndexOf(precedingField) + 1, 0, fieldName);
    } else if (followingField) {
      resolvedOrder.splice(resolvedOrder.indexOf(followingField), 0, fieldName);
    } else {
      resolvedOrder.push(fieldName);
    }
  }

  return resolvedOrder;
}

function renderFields(
  fieldNames: string[],
  properties: ObjectFieldTemplateProps['properties'],
  visibleFields: Set<string>,
  rows: RowDefinition[],
  rowFieldNames: Set<string>,
  renderedRows: Set<string>,
  externalFields: Readonly<Record<string, ReactNode>>
) {
  return fieldNames.map((fieldName) => {
    if (!visibleFields.has(fieldName)) return null;

    if (fieldName.startsWith(externalFieldPrefix)) {
      const externalFieldName = fieldName.slice(externalFieldPrefix.length);
      const externalField = externalFields[externalFieldName];
      return externalField ? (
        <div key={fieldName} className="min-w-0 max-w-full" data-cy={`schema-external-field-${externalFieldName}`}>
          {externalField}
        </div>
      ) : null;
    }

    const row = rows.find((r) => r.fields[0] === fieldName);
    if (row) {
      const rowKey = row.fields.join('-');
      if (renderedRows.has(rowKey)) return null;
      renderedRows.add(rowKey);

      const visibleRowFields = row.fields.filter((f) => visibleFields.has(f));
      if (visibleRowFields.length === 0) return null;

      return (
        <div
          key={rowKey}
          className={`flex min-w-0 flex-col md:flex-row ${row.gap || 'gap-32'}`}
          data-cy="schema-field-row"
        >
          {visibleRowFields.map((f) => {
            const prop = properties.find((p) => p.name === f);
            return prop ? (
              <div key={f} className="w-full min-w-0 md:flex-1">
                {prop.content}
              </div>
            ) : null;
          })}
        </div>
      );
    }

    if (rowFieldNames.has(fieldName)) return null;

    const prop = properties.find((p) => p.name === fieldName);
    return prop ? (
      <div key={fieldName} className="min-w-0 max-w-full">
        {prop.content}
      </div>
    ) : null;
  });
}

export function SectionsObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { properties, formData, formContext, uiSchema, disabled, readonly, description, idSchema, required, title } =
    props;

  const ctx = formContext as FormContext | undefined;
  const externalFields = ctx?.externalFields ?? {};
  const originalSchema = ctx?.originalSchema;
  const conditionalFields = originalSchema
    ? getConditionalFields(originalSchema)
    : new Map<string, ConditionalRule['if'][]>();

  const rows = getRowDefinitions(uiSchema);
  const rowFieldNames = new Set(rows.flatMap((r) => r.fields));
  const sections = getSectionDefinitions(uiSchema);
  const showCompletionControl = uiSchema?.['ui:options']?.showSectionCompletion !== false;
  const showObjectFieldset = uiSchema?.['ui:options']?.showObjectFieldset === true;
  const propertyNames = properties.map((p) => p.name);
  const order = resolveFieldOrder(uiSchema?.['ui:order'], propertyNames);
  const isReadonly = !!(disabled || readonly);

  const visibleFields = new Set<string>();
  for (const prop of properties) {
    const conditions = conditionalFields.get(prop.name);
    if (conditions) {
      if (conditions.some((condition) => isConditionMet(condition, formData || {}))) {
        visibleFields.add(prop.name);
      }
    } else {
      visibleFields.add(prop.name);
    }
  }
  for (const externalFieldName of Object.keys(externalFields)) {
    visibleFields.add(`${externalFieldPrefix}${externalFieldName}`);
  }

  if (sections.length === 0) {
    const renderedRows = new Set<string>();
    const renderedFields = (
      <div className="flex min-w-0 max-w-full flex-col gap-32">
        {renderFields(order, properties, visibleFields, rows, rowFieldNames, renderedRows, externalFields)}
      </div>
    );

    if (idSchema.$id === (ctx?.idPrefix ?? 'root') || !showObjectFieldset) return renderedFields;

    return (
      <fieldset
        className="w-full min-w-0 max-w-full rounded-12 border-1 border-divider bg-background-100 p-16"
        data-cy="schema-object-fieldset"
      >
        {title && (
          <legend className="box-border max-w-full break-words px-8 text-label-medium font-bold whitespace-normal">
            {title}
            {required ? ' *' : ''}
          </legend>
        )}
        {description && <p className="mb-16 text-small text-dark-secondary">{description}</p>}
        {renderedFields}
      </fieldset>
    );
  }

  const sectionFieldNames = new Set(sections.flatMap((s) => s.fields));
  const unsectionedFields = order.filter((f) => !sectionFieldNames.has(f) && visibleFields.has(f));
  const renderedRows = new Set<string>();

  return (
    <div className="flex min-w-0 max-w-full flex-col gap-32">
      {sections.map((section) => {
        const sectionFieldsInOrder = insertExternalFieldsInSectionOrder(order, section.fields).filter((fieldName) =>
          visibleFields.has(fieldName)
        );
        if (sectionFieldsInOrder.length === 0) return null;

        return (
          <SectionDisclosure
            key={section.id}
            disclosureId={`${idSchema.$id}-${section.id}`}
            section={section}
            isReadonly={isReadonly}
            showCompletionControl={showCompletionControl}
          >
            <div className="flex min-w-0 max-w-full flex-col gap-32 py-16">
              {renderFields(
                sectionFieldsInOrder,
                properties,
                visibleFields,
                rows,
                rowFieldNames,
                renderedRows,
                externalFields
              )}
            </div>
          </SectionDisclosure>
        );
      })}

      {unsectionedFields.length > 0 && (
        <div className="flex min-w-0 max-w-full flex-col gap-32">
          {renderFields(
            unsectionedFields,
            properties,
            visibleFields,
            rows,
            rowFieldNames,
            renderedRows,
            externalFields
          )}
        </div>
      )}
    </div>
  );
}
