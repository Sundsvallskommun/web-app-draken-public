import { BillingFormData } from '@casedata/interfaces/billing';
import { useAppContext } from '@contexts/app.context';
import { Checkbox, DatePicker, FormControl, FormLabel, Input, Textarea } from '@sk-web-gui/react';
import { FC } from 'react';
import { useFormContext } from 'react-hook-form';

export const BillingSpecifications: FC = () => {
  const { errand } = useAppContext();
  const { register, watch, setValue } = useFormContext<BillingFormData>();

  const selectedFacilities = watch('specifications.selectedFacilities') || [];

  const handleFacilityToggle = (propertyDesignation: string, checked: boolean) => {
    const updatedFacilities = checked
      ? [...selectedFacilities, propertyDesignation]
      : selectedFacilities.filter((f) => f !== propertyDesignation);

    setValue('specifications.selectedFacilities', updatedFacilities);
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-row w-full gap-16">
        <FormControl className="w-full">
          <FormLabel>Vår referens</FormLabel>
          <Input placeholder="Ange vår referens" {...register('specifications.ourReference')} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Kundens referens</FormLabel>
          <Input placeholder="Ange kundens referens" {...register('specifications.customerReference')} />
        </FormControl>
        <FormControl className="w-full">
          <FormLabel>Avviseringsdatum</FormLabel>
          <DatePicker {...register('specifications.rejectionDate')} />
          <small>Sätt som rutin den första i månaden.</small>
        </FormControl>
      </div>
      <div className="w-full">
        <FormControl className="w-full">
          <FormLabel>Avitext</FormLabel>
          <Textarea className="w-full" rows={3} {...register('specifications.avitext')} />
        </FormControl>
      </div>
      <div>
        <FormControl>
          <FormLabel>
            Ange vilka fastighet/er som fakturan gäller <span className="font-normal">(hämtad från uppgifter)</span>
          </FormLabel>
          {(errand?.facilities?.length ?? 0) > 0 ? (
            <Checkbox.Group data-cy="property-designation-checkboxgroup" name="propertyDesignations">
              {errand?.facilities?.map((facility, index) => {
                const propertyDesignation = facility?.address?.propertyDesignation ?? '';
                const isChecked = selectedFacilities.includes(propertyDesignation);
                return (
                  <Checkbox
                    key={index}
                    checked={isChecked}
                    onChange={(e) => handleFacilityToggle(propertyDesignation, e.target.checked)}
                  >
                    {propertyDesignation}
                  </Checkbox>
                );
              })}
            </Checkbox.Group>
          ) : (
            <span className="italic">Inga fastighetsbeteckningar finns angivna på ärendet</span>
          )}
        </FormControl>
      </div>
    </div>
  );
};
