import { Checkbox, FormControl, FormErrorMessage, FormLabel, Input, RadioButton, Select } from '@sk-web-gui/react';
import {
  customerIdentities,
  invoiceActivities,
  invoiceTypes,
} from '@supportmanagement/services/support-billing-service';
import { ApiSupportErrand, isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext, UseFormReturn } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

export const BillingForm = ({ recipientName }) => {
  const {
    control,
    register,
    getValues,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<CBillingRecord>();

  const [development, setDevelopment] = useState<boolean>(false);
  const [developmentCost, setDevelopmentCost] = useState<number>(0);

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
    control,
    name: 'invoice.invoiceRows',
  });

  const handleDevelopmentCost = (checked) => {
    console.log('checked', checked);
    if (checked) {
      append({
        descriptions: ['Utvecklingskostnad'],
        quantity: 1,
        costPerUnit: developmentCost,
        totalAmount: developmentCost,
        accountInformation: {
          activity: getValues().invoice.invoiceRows[0].accountInformation.activity,
          project: '11041',
        },
      });
    } else {
      remove(fields.length - 1);
    }
    setDevelopment(checked);
  };

  useEffect(() => {
    const newTotal = getValues(`invoice.invoiceRows.${0}.quantity`) * getValues(`invoice.invoiceRows.${0}.costPerUnit`);
    setValue(`invoice.invoiceRows.${0}.totalAmount`, newTotal);
    setDevelopmentCost(newTotal * 0.02);
    if (fields.length > 1) {
      setValue(`invoice.invoiceRows.${1}.totalAmount`, newTotal * 0.02);
      setValue(
        `invoice.invoiceRows.${1}.accountInformation.activity`,
        getValues().invoice.invoiceRows[0].accountInformation.activity
      );
    }
  }, [getValues().invoice.invoiceRows[0].quantity, getValues().invoice.invoiceRows[0].accountInformation.activity]);

  return (
    <>
      <div className="my-lg gap-xl">
        <FormControl>
          <FormLabel>Faktureringstyp</FormLabel>

          <RadioButton.Group className="block w-full" data-cy="radio-button-group" inline={true}>
            <div className="flex justify-between flex-wrap w-full">
              {invoiceTypes.map((invoiceType) => (
                <div className="w-1/2" key={invoiceType.key}>
                  <RadioButton
                    data-cy={`invoice-type-${invoiceType}`}
                    className="mr-lg mb-sm whitespace-nowrap"
                    name={invoiceType.key}
                    id={invoiceType.key}
                    value={invoiceType.displayName}
                    {...register('invoice.description')}
                    defaultChecked={getValues().type === invoiceType.displayName}
                  >
                    {invoiceType.displayName}
                  </RadioButton>
                </div>
              ))}
              {errors.type && (
                <div className="text-error">
                  <FormErrorMessage>{errors.type?.message}</FormErrorMessage>
                </div>
              )}
            </div>
          </RadioButton.Group>
        </FormControl>
      </div>
      <Checkbox
        checked={development}
        value={development ? 'true' : 'false'}
        onChange={(e) => {
          handleDevelopmentCost(e.currentTarget.checked);
        }}
        indeterminate={false}
      >
        Utvecklingskostnad
      </Checkbox>
      {fields.map((field, index) => (
        <div key={field.id} className="bg-blue-50 my-8 px-12 py-12 rounded-24">
          <div className="flex gap-md mt-8">
            <span>{getValues(`invoice.invoiceRows.${index}.descriptions`)}</span>
          </div>
          <div className="flex gap-md mt-8">
            <div className="my-sm w-1/3">
              <FormControl id="quantity" className="w-full">
                <FormLabel>Antal timmar</FormLabel>
                <Input
                  {...register(`invoice.invoiceRows.${index}.quantity`)}
                  data-cy="quantity-input"
                  className="w-full text-dark-primary"
                  type="text"
                  // inputMode="numeric"
                  // pattern="\d*[,.]?\d{0,2}"
                  // type="number"
                  // step={0.01}
                  // min={0}
                  size="md"
                  readOnly={index === 1 && development}
                />
                {errors.invoice?.invoiceRows?.[index]?.quantity && (
                  <div className="text-error">
                    <FormErrorMessage>{errors.invoice?.invoiceRows[index]?.quantity?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>

            <div className="my-sm gap-xl w-1/3">
              <FormControl id="costPerUnit" className="w-full">
                <FormLabel>Timpris</FormLabel>
                <Input
                  {...register(`invoice.invoiceRows.${index}.costPerUnit`)}
                  data-cy="costPerUnit-input"
                  className="w-full text-dark-primary"
                  size="md"
                  placeholder={'0'}
                  readOnly
                />
                {errors.invoice?.invoiceRows?.[index]?.costPerUnit && (
                  <div className="text-error">
                    <FormErrorMessage>{errors.invoice?.invoiceRows[index]?.costPerUnit?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>
            <div className="my-sm w-1/3">
              <FormControl id="quantity" className="w-full">
                <FormLabel>Total kostnad</FormLabel>
                <Input
                  {...register(`invoice.invoiceRows.${index}.totalAmount`)}
                  data-cy="quantity-input"
                  className="w-full text-dark-primary"
                  type="text"
                  // value={(
                  //   watch(`invoice.invoiceRows.${index}.quantity`) * watch(`invoice.invoiceRows.${index}.costPerUnit`)
                  // ).toString()}
                  readOnly
                  size="md"
                />
                {errors.invoice?.invoiceRows?.[index]?.totalAmount && (
                  <div className="text-error">
                    <FormErrorMessage>{errors.invoice?.invoiceRows[index]?.totalAmount?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>
          </div>
        </div>
      ))}
      <div className="flex mb-md gap-24">
        <div className="flex w-1/2">
          <FormControl id="supervisor" className="w-full">
            <FormLabel>Chef</FormLabel>
            <Input
              data-cy="manager-input"
              className="w-full text-dark-primary"
              readOnly
              value={recipientName}
              size="md"
            />
            {errors.recipient ? (
              <div className="text-error">
                <FormErrorMessage>{errors.recipient?.message}</FormErrorMessage>
              </div>
            ) : (
              <span className="text-small">Namn på den som ska faktureras</span>
            )}
          </FormControl>
        </div>
        <div className="flex w-1/2">
          <FormControl id="referenceNumber" className="w-full">
            <FormLabel>Referensnummer</FormLabel>
            <Input
              {...register('invoice.customerReference')}
              data-cy="referenceNumber-input"
              className="w-full text-dark-primary"
              size="md"
              readOnly
              // value={getValues().referenceNumber}
              // onChange={(e) => {
              //   setValue('referenceNumber', e.target.value);
              //   trigger('referenceNumber');
              // }}
            />
            {errors.invoice?.customerReference ? (
              <div className="text-error">
                <FormErrorMessage>{errors.invoice.customerReference?.message}</FormErrorMessage>
              </div>
            ) : (
              <span className="text-small">Referensnummer för den som får fakturan</span>
            )}
          </FormControl>
        </div>
      </div>
      <div className="flex gap-md mt-8 mb-lg">
        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Kundidentitet</FormLabel>
            <Select
              {...register('invoice.customerId')}
              data-cy="customerId-input"
              className="w-full text-dark-primary"
              size="md"
              // value={getValues('customerId')}
              placeholder={'0'}
              // onChange={(e) => {
              //   setValue('customerId', e.target.value);
              //   trigger('customerId');
              // }}
            >
              {customerIdentities.map((identity) => (
                <Select.Option key={identity.customerId} value={identity.customerId}>
                  {identity.customerName}
                </Select.Option>
              ))}
            </Select>
            {errors.invoice?.customerId && (
              <div className="text-error">
                <FormErrorMessage>{errors.invoice.customerId?.message}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>

        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Aktivitet</FormLabel>
            <Select
              {...register('invoice.invoiceRows.0.accountInformation.activity')}
              data-cy="activity-input"
              className="w-full text-dark-primary"
              size="md"
              // value={getValues('activity')}
              placeholder={'0'}
              // onChange={(e) => {
              //   setValue('activity', e.target.value);
              //   trigger('activity');
              // }}
            >
              <Select.Option value={''}>Välj aktivitet</Select.Option>
              {invoiceActivities.map((activity) => (
                <Select.Option key={activity.id} value={activity.value}>
                  {activity.displayName}
                </Select.Option>
              ))}
            </Select>
            {errors.invoice?.invoiceRows?.[0]?.accountInformation?.activity && (
              <div className="text-error">
                <FormErrorMessage>
                  {errors.invoice?.invoiceRows?.[0]?.accountInformation?.activity.message}
                </FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>
    </>
  );
};
