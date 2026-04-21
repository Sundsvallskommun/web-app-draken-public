import { BillingFormData } from '@casedata/interfaces/billing';
import { Checkbox, DatePicker, FormControl, FormErrorMessage, FormLabel, Input } from '@sk-web-gui/react';
import { useCasedataStore } from '@stores/index';
import { useFormContext } from 'react-hook-form';

export const BillingSpecifications: React.FC = () => {
  const avitextMaxLength = 30;
  const errand = useCasedataStore((s) => s.errand);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<BillingFormData>();

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
        <FormControl className="w-full" invalid={!!errors.specifications?.ourReference}>
          <FormLabel>Vår referens *</FormLabel>
          <Input placeholder="Ange vår referens" {...register('specifications.ourReference')} />
          {errors.specifications?.ourReference && (
            <FormErrorMessage>{errors.specifications.ourReference.message}</FormErrorMessage>
          )}
        </FormControl>
        <FormControl className="w-full" invalid={!!errors.specifications?.customerReference}>
          <FormLabel>Kundens referens *</FormLabel>
          <Input placeholder="Ange kundens referens" {...register('specifications.customerReference')} />
          {errors.specifications?.customerReference && (
            <FormErrorMessage>{errors.specifications.customerReference.message}</FormErrorMessage>
          )}
        </FormControl>
        <FormControl invalid={!!errors.specifications?.rejectionDate}>
          <FormLabel>Aviseringsdatum</FormLabel>
          <DatePicker
            className="w-[25rem]"
            min={new Date().toISOString().split('T')[0]}
            {...register('specifications.rejectionDate')}
          />
          <small>Välj den första dagen i månaden.</small>
          {errors.specifications?.rejectionDate && (
            <FormErrorMessage>{errors.specifications.rejectionDate.message}</FormErrorMessage>
          )}
        </FormControl>
      </div>
      <div className="w-full pb-16">
        <FormControl className="w-full" invalid={!!errors.specifications?.avitext}>
          <div className="flex flex-row justify-between">
            <FormLabel>Avitext</FormLabel>
            <span>
              {watch('specifications.avitext')?.length || 0}/{avitextMaxLength}
            </span>
          </div>
          <Input className="w-full" maxLength={avitextMaxLength} {...register('specifications.avitext')} />
          <small>Ange vad fakturan avser och vilken period den gäller.</small>
        </FormControl>
      </div>
      <div>
        <FormControl invalid={!!errors.specifications?.selectedFacilities}>
          <FormLabel>Lägg till fastigheter som fakturan gäller</FormLabel>
          {(errand?.facilities?.length ?? 0) > 0 ? (
            <>
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
              <small>Fastigheter hämtas från Ärendeuppgifter.</small>
            </>
          ) : (
            <span className="text-secondary">Inga fastighetsbeteckningar finns angivna på ärendet</span>
          )}
        </FormControl>
      </div>
    </div>
  );
};
