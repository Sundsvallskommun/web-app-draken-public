'use client';

import type { ObjectFieldTemplateProps, RJSFSchema, UiSchema } from '@rjsf/utils';
import { Checkbox, Disclosure, Divider, Label } from '@sk-web-gui/react';
import React, { useState } from 'react';
import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';

interface ConditionalRule {
  if: {
    properties: Record<string, { const: unknown }>;
    required?: string[];
  };
  then: {
    required?: string[];
    properties?: Record<string, unknown>;
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
}

function isConditionMet(condition: ConditionalRule['if'], formData: Record<string, unknown>): boolean {
  if (!condition?.properties) return false;

  for (const [field, rule] of Object.entries(condition.properties)) {
    if ('const' in rule) {
      if (formData[field] !== rule.const) {
        return false;
      }
    }
  }
  return true;
}

function extractDependentFields(then: ConditionalRule['then']): string[] {
  return [...(then.required || []), ...(then.properties ? Object.keys(then.properties) : [])];
}

function getConditionalFields(schema: RJSFSchema): Map<string, ConditionalRule['if']> {
  const conditionalFields = new Map<string, ConditionalRule['if']>();

  const allOf = schema.allOf as ConditionalRule[] | undefined;
  if (allOf) {
    for (const rule of allOf) {
      if (rule.if && rule.then) {
        for (const field of extractDependentFields(rule.then)) {
          conditionalFields.set(field, rule.if);
        }
      }
    }
  }

  const rootIf = schema.if as ConditionalRule['if'] | undefined;
  const rootThen = schema.then as ConditionalRule['then'] | undefined;
  if (rootIf && rootThen) {
    for (const field of extractDependentFields(rootThen)) {
      conditionalFields.set(field, rootIf);
    }
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
  section: SectionDefinition;
  isReadonly: boolean;
  children: React.ReactNode;
}

function SectionDisclosure({ section, isReadonly, children }: SectionDisclosureProps) {
  const [open, setOpen] = useState(section.defaultOpen ?? false);
  const [doneMark, setDoneMark] = useState(false);

  const handleDoneMarkChange = () => {
    const newDoneMark = !doneMark;
    setDoneMark(newDoneMark);

    if (newDoneMark) {
      setOpen(false);
    }
  };

  return (
    <Disclosure variant="alt" className="w-full" open={open} onToggleOpen={setOpen}>
      <Disclosure.Header>
        {section.icon && (
          <Disclosure.Icon
            icon={(() => { const DynIcon = iconMap[section.icon as string]; return DynIcon ? <DynIcon /> : null; })()}
          />
        )}
        <Disclosure.Title>{section.title}</Disclosure.Title>
        {doneMark && (
          <Label inverted rounded color="gronsta">
            Komplett
          </Label>
        )}
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        {children}
        {!isReadonly && (
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

function renderFields(
  fieldNames: string[],
  properties: ObjectFieldTemplateProps['properties'],
  visibleFields: Set<string>,
  rows: RowDefinition[],
  rowFieldNames: Set<string>,
  renderedRows: Set<string>
) {
  return fieldNames.map((fieldName) => {
    if (!visibleFields.has(fieldName)) return null;

    const row = rows.find((r) => r.fields[0] === fieldName);
    if (row) {
      const rowKey = row.fields.join('-');
      if (renderedRows.has(rowKey)) return null;
      renderedRows.add(rowKey);

      const visibleRowFields = row.fields.filter((f) => visibleFields.has(f));
      if (visibleRowFields.length === 0) return null;

      return (
        <div key={rowKey} className={`flex ${row.gap || 'gap-32'}`}>
          {visibleRowFields.map((f) => {
            const prop = properties.find((p) => p.name === f);
            return prop ?
                <div key={f} className="flex-1">
                  {prop.content}
                </div>
              : null;
          })}
        </div>
      );
    }

    if (rowFieldNames.has(fieldName)) return null;

    const prop = properties.find((p) => p.name === fieldName);
    return prop ? <div key={fieldName}>{prop.content}</div> : null;
  });
}

export function SectionsObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { properties, formData, formContext, uiSchema, disabled, readonly } = props;

  const ctx = formContext as FormContext | undefined;
  const originalSchema = ctx?.originalSchema;
  const conditionalFields = originalSchema ? getConditionalFields(originalSchema) : new Map();

  const rows = getRowDefinitions(uiSchema);
  const rowFieldNames = new Set(rows.flatMap((r) => r.fields));
  const sections = getSectionDefinitions(uiSchema);
  const propertyNames = properties.map((p) => p.name);
  const order = resolveFieldOrder(uiSchema?.['ui:order'], propertyNames);
  const isReadonly = !!(disabled || readonly);

  const visibleFields = new Set<string>();
  for (const prop of properties) {
    const condition = conditionalFields.get(prop.name);
    if (condition) {
      if (isConditionMet(condition, formData || {})) {
        visibleFields.add(prop.name);
      }
    } else {
      visibleFields.add(prop.name);
    }
  }

  if (sections.length === 0) {
    const renderedRows = new Set<string>();
    return (
      <div className="flex flex-col gap-32">
        {renderFields(order, properties, visibleFields, rows, rowFieldNames, renderedRows)}
      </div>
    );
  }

  const sectionFieldNames = new Set(sections.flatMap((s) => s.fields));
  const unsectionedFields = order.filter((f) => !sectionFieldNames.has(f) && visibleFields.has(f));
  const renderedRows = new Set<string>();

  return (
    <div className="flex flex-col gap-32">
      {sections.map((section) => {
        const sectionFieldsInOrder = order.filter((f) => section.fields.includes(f) && visibleFields.has(f));
        if (sectionFieldsInOrder.length === 0) return null;

        return (
          <SectionDisclosure key={section.id} section={section} isReadonly={isReadonly}>
            <div className="flex flex-col gap-32 py-16">
              {renderFields(sectionFieldsInOrder, properties, visibleFields, rows, rowFieldNames, renderedRows)}
            </div>
          </SectionDisclosure>
        );
      })}

      {unsectionedFields.length > 0 && (
        <div className="flex flex-col gap-32">
          {renderFields(unsectionedFields, properties, visibleFields, rows, rowFieldNames, renderedRows)}
        </div>
      )}
    </div>
  );
}
