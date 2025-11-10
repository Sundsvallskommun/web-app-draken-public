'use client';

import { FieldTemplate } from '@common/components/json/fields/field-template.componant';
import { SubmitButtonFieldTemplate } from '@common/components/json/fields/submit-button-field-template.componant';
import { globalWidgets } from '@common/components/json/widgets/index.componant';
import Form, { FormProps, IChangeEvent } from '@rjsf/core';
import type { RegistryWidgetsType, RJSFSchema, UiSchema } from '@rjsf/utils';
import validatorAjv8 from '@rjsf/validator-ajv8';
import { useCallback, useMemo, useState } from 'react';
import createJsonErrorTransformer from '../utils/schema-form-error-handling';

const widgets: RegistryWidgetsType = {
  TextWidget: globalWidgets.TextWidget,
  SelectWidget: globalWidgets.SelectWidget,
  RadioWidget: globalWidgets.RadiobuttonWidget,
  RadiobuttonWidget: globalWidgets.RadiobuttonWidget,
  CheckboxWidget: globalWidgets.CheckboxWidget,
  DateWidget: globalWidgets.DateWidget,
  ComboboxWidget: globalWidgets.ComboboxWidget,
  TexteditorWidget: globalWidgets.TexteditorWidget,
  TextareaWidget: globalWidgets.TextareaWidget,
};

type AnyProp = {
  type?: string | string[];
  format?: string;
  oneOf?: any[];
  enum?: any[];
  items?: AnyProp;
  widget?: string;
};

type SchemaFormProps = {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  formData?: any;
  onChange?: (data: any, e?: IChangeEvent) => void;
  onSubmit?: (payload: any, e: IChangeEvent) => void;
  objectFieldTemplate?: React.ComponentType<any>;
};

const hasType = (p: AnyProp | undefined, t: string) =>
  typeof p?.type === 'string' ? p!.type === t : Array.isArray(p?.type) ? p!.type!.includes(t) : false;
const isOneOfStrings = (p?: AnyProp) => Array.isArray(p?.oneOf) && p!.oneOf.every((o) => typeof o?.const === 'string');
const isEnumStrings = (p?: AnyProp) => Array.isArray(p?.enum) && p!.enum.every((v) => typeof v === 'string');

function buildUiSchemaFromSchema(schema: RJSFSchema): UiSchema {
  const ui: UiSchema = {};
  const props = (schema?.properties ?? {}) as Record<string, AnyProp>;

  for (const [key, prop] of Object.entries(props)) {
    const entry: Record<string, any> = {};

    if (prop.widget) {
      entry['ui:widget'] = prop.widget;
    } else {
      if ((hasType(prop, 'string') || hasType(prop, 'null')) && prop.format === 'date') {
        entry['ui:widget'] = 'date';
      }

      if (
        hasType(prop, 'array') &&
        prop.items &&
        (hasType(prop.items, 'string') || !prop.items.type) &&
        (isOneOfStrings(prop.items) || isEnumStrings(prop.items))
      ) {
        entry['ui:widget'] = 'ComboboxWidget';
      }

      if (hasType(prop, 'string') && (isOneOfStrings(prop) || isEnumStrings(prop))) {
        entry['ui:widget'] ??= 'select';
      }
      if (hasType(prop, 'boolean')) {
        entry['ui:widget'] ??= 'checkbox';
      }
      if (hasType(prop, 'string')) {
        entry['ui:widget'] ??= 'TextWidget';
      }
    }

    if (Object.keys(entry).length) ui[key] = entry;
  }
  return ui;
}

export default function SchemaForm({
  schema,
  uiSchema,
  formData,
  onChange,
  onSubmit,
  objectFieldTemplate,
}: SchemaFormProps) {
  const [localData, setLocalData] = useState<any>({});
  const data = formData ?? localData;

  const handleChange = useCallback<FormProps<any>['onChange']>(
    (e) => {
      const fd = { ...e.formData };
      if (formData !== undefined) {
        onChange?.(fd, e);
      } else {
        setLocalData(fd);
      }
    },
    [formData, onChange]
  );

  const autoUi = useMemo(() => buildUiSchemaFromSchema(schema), [schema]);

  const handleSubmit = useCallback<NonNullable<FormProps<any>['onSubmit']>>(
    (e) => {
      const payload = e.formData;
      onSubmit?.(payload, e);
    },
    [onSubmit]
  );

  const templates: any = {
    FieldTemplate,
    ButtonTemplates: { SubmitButton: SubmitButtonFieldTemplate },
  };

  if (objectFieldTemplate) {
    templates.ObjectFieldTemplate = objectFieldTemplate;
  }

  return (
    <div className="w-full max-w-full">
      <Form
        schema={schema || { type: 'object', properties: {} }}
        uiSchema={uiSchema ?? autoUi}
        formData={data}
        onChange={handleChange}
        onSubmit={handleSubmit}
        validator={validatorAjv8}
        widgets={widgets}
        templates={templates}
        transformErrors={createJsonErrorTransformer(schema)}
        noHtml5Validate
        showErrorList={false}
      />
    </div>
  );
}
