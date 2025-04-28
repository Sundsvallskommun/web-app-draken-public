import React from 'react';
import { useAppContext } from '@contexts/app.context';
import { Button, Checkbox, Disclosure, FormControl, FormLabel, Input, Textarea } from '@sk-web-gui/react';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { useForm } from 'react-hook-form';
import { getRecruitmentParameters, saveParameters } from '@supportmanagement/services/support-parameter-service';
import { Parameter } from '@common/data-contracts/supportmanagement/data-contracts';

export const SupportErrandRecruitmentTab: React.FC<{
  update: () => void;
}> = () => {
  const { supportErrand } = useAppContext();

  const parameters = getRecruitmentParameters();

  const { register, getValues } = useForm<Parameter[]>();

  const handleSubmit = () => {
    const saved = saveParameters(getValues());
  };

  console.log(getValues());

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Rekryteringsprocess</h2>
        <p>Här hanterar du uppgifterna för rekryteringsprocessen.</p>

        <FormControl onSubmit={handleSubmit} className="w-full">
          {Object.entries(parameters).map(([key, value]: [string, Parameter[]], index) => {
            return (
              <Disclosure
                key={`disclosure-${key}`}
                header={value[0].displayName}
                variant="alt"
                icon={<LucideIcon name="text" />}
                label="Komplett"
              >
                {value.map((val, index) => {
                  return (
                    <div key={`${val.key}-${index}`} className="pb-16">
                      <Input {...register(`${index}.key`)} value={val.key} hidden />
                      <Input {...register(`${index}.group`)} value={val.group} hidden />
                      <Input {...register(`${index}.displayName`)} value={val.displayName} hidden />
                      <FormLabel className="pb-16" {...register(`${index}.values.0`)}>
                        {val.group}
                      </FormLabel>
                      <Checkbox className="block py-16" {...register(`${index}.values.1`)}>
                        {val.values[0]}
                      </Checkbox>

                      <Textarea
                        className="w-full"
                        rows={3}
                        {...register(`${index}.values.2`)}
                        placeholder="Anteckningar..."
                      />
                    </div>
                  );
                })}
              </Disclosure>
            );
          })}
          <Button onClick={handleSubmit}>Spara</Button>
        </FormControl>
      </div>
    </div>
  );
};
