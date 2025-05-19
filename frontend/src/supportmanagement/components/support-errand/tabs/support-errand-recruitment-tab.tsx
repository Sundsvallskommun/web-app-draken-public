import { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Checkbox, Disclosure, FormControl, FormLabel, Input, Textarea } from '@sk-web-gui/react';
import { getRecruitmentParameters, saveParameters } from '@supportmanagement/services/support-parameter-service';
import React, { useEffect } from 'react';
import { useForm, useFormContext } from 'react-hook-form';

import { default as JsonForm } from '@rjsf/core';
import { RegistryWidgetsType, RJSFSchema, UiSchema, WidgetProps } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { group } from 'console';
import { title } from 'process';

export const SupportErrandRecruitmentTab: React.FC<{
  update: () => void;
  setUnsaved: (unsaved: boolean) => void;
}> = (props) => {
  const { supportErrand } = useAppContext();
  const [recruitmentParameterGroups, setParameters] = React.useState<{ [key: string]: Parameter[] }>({});
  const [loading, setLoading] = React.useState(false);

  const recruitmentForm = useForm<{ [key: string]: Parameter[] }>({
    defaultValues: recruitmentParameterGroups,
  });

  const errandForm = useFormContext<{ [key: string]: Parameter[] }>();

  useEffect(() => {
    const ps = getRecruitmentParameters(supportErrand);
    setParameters(ps);
    recruitmentForm.reset(structuredClone(ps));
  }, [supportErrand, recruitmentForm.reset]);

  const handleSubmit = async () => {
    setLoading(true);
    await saveParameters(supportErrand.id, '2281', recruitmentForm.getValues()).then((res) => {
      setLoading(false);
      return res;
    });
  };

  const schemaField = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        key: { type: 'string', title: 'Key' },
        displayName: { type: 'string', title: 'Display Name' },
        group: { type: 'string', title: 'Group' },
        values: {
          type: 'array',
          items: {
            type: 'string',
            title: 'Values',
          },
        },
      },
    },
  };

  const schema: RJSFSchema = {
    type: 'object',
    title: 'recruitment@upstart',
    properties: {
      'recruitment@upstart': schemaField,
      'recruitment@advertisement': schemaField,
    },
  };

  // const uiSchema: UiSchema = {
  //   'ui:widget': 'text',
  // };

  const CustomTextfield = function (props: WidgetProps) {
    return <Input id="custom" onChange={() => props.onChange(!props.value)} value={String(props.value)} />;
  };

  const widgets: RegistryWidgetsType = {
    TextWidget: CustomTextfield,
  };

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Rekryteringsprocess</h2>
        <p>Här hanterar du uppgifterna för rekryteringsprocessen.</p>

        <FormControl
          onSubmit={handleSubmit}
          onChange={() => {
            // Collect values from the form on this tab and set them in the errand form.
            // If a corresponding value already exists in the errand form, remove it and
            // then add the new values.
            let toParams = errandForm.getValues('parameters') || [];
            Object.entries(recruitmentParameterGroups).forEach(([key, params]: [string, Parameter[]], index) => {
              params.forEach((val, index) => {
                const v = {
                  key: val.key,
                  displayName: val.displayName,
                  group: val.group,
                  values: recruitmentForm.getValues(`${key}.${index}.values`),
                };
                if (toParams.find((p) => p.key === v.key)) {
                  toParams = toParams.filter((p) => p.key !== v.key);
                }
                toParams.push(v);
              });
            });
            errandForm.setValue('parameters', toParams, { shouldDirty: true });
            console.log('toParams2', toParams);
            props.setUnsaved(true);
          }}
          className="w-full"
        >
          {Object.entries(recruitmentParameterGroups).map(([key, param]: [string, Parameter[]], index) => {
            return (
              <Disclosure
                key={`disclosure-${key}`}
                header={param[0].displayName}
                variant="alt"
                icon={<LucideIcon name="text" />}
                label={
                  param.every((p, p_idx) => recruitmentForm.getValues(`${key}.${p_idx}.values.1`) === 'true')
                    ? 'Komplett'
                    : null
                }
              >
                {param.map((val, index) => {
                  return (
                    <div key={`${val.key}-${index}`} className="pb-16">
                      <Input {...recruitmentForm.register(`${key}.${index}.key`)} hidden />
                      <Input {...recruitmentForm.register(`${key}.${index}.group`)} value={val.group} hidden />
                      <Input
                        {...recruitmentForm.register(`${key}.${index}.displayName`)}
                        value={val.displayName}
                        hidden
                      />
                      <FormLabel className="pb-16" {...recruitmentForm.register(`${key}.${index}.values.0`)}>
                        {val.group}
                      </FormLabel>
                      <Input type="hidden" {...recruitmentForm.register(`${key}.${index}.values.1`)} />
                      <Checkbox
                        defaultChecked={recruitmentForm.getValues(`${key}.${index}.values.1`) === 'true'}
                        onChange={(e) => {
                          recruitmentForm.setValue(
                            `${key}.${index}.values.1`,
                            e.currentTarget.checked === true ? 'true' : 'false'
                          );
                        }}
                        className="block py-16"
                      >
                        {val.values[0]}
                      </Checkbox>

                      <Textarea
                        className="w-full"
                        rows={3}
                        {...recruitmentForm.register(`${key}.${index}.values.2`)}
                        placeholder="Anteckningar..."
                        value={recruitmentForm.getValues(`${key}.${index}.values.2`)}
                      />
                    </div>
                  );
                })}
              </Disclosure>
            );
          })}
        </FormControl>
        <h2>React json schema form</h2>
        {JSON.stringify(recruitmentParameterGroups)}
        <JsonForm formData={recruitmentParameterGroups} schema={schema} validator={validator} widgets={widgets} />
      </div>
    </div>
  );
};
