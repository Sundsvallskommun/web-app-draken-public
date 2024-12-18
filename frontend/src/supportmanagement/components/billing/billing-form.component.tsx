import { twoDecimals } from '@common/services/helper-service';
import { AppContextInterface, useAppContext } from '@contexts/app.context';
import { Checkbox, FormControl, FormErrorMessage, FormLabel, Input, RadioButton, Select } from '@sk-web-gui/react';
import {
  customerIdentities,
  invoiceActivities,
  invoiceTypes,
} from '@supportmanagement/services/support-billing-service';
import { useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
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

  const { user }: AppContextInterface = useAppContext();

  const [development, setDevelopment] = useState<boolean>(false);
  const [developmentCost, setDevelopmentCost] = useState<number>(0);

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
    control,
    name: 'invoice.invoiceRows',
  });
  
  const quantity = watch('invoice.invoiceRows.0.quantity');
  const activity = watch('invoice.invoiceRows.0.accountInformation.activity');
  const totalAmount = watch('invoice.invoiceRows.0.totalAmount');

  const handleDevelopmentCost = (checked) => {
    if (checked) {
      append({
        descriptions: ['Utvecklingskostnad 2%'],
        quantity: 1,
        costPerUnit: twoDecimals(totalAmount * 0.02),
        totalAmount: twoDecimals(totalAmount * 0.02),
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
    setValue(`invoice.invoiceRows.${0}.totalAmount`, twoDecimals(newTotal));
    setDevelopmentCost(twoDecimals(newTotal * 0.02));
    if (fields.length > 1) {
      setValue(`invoice.invoiceRows.${1}.costPerUnit`, twoDecimals(newTotal * 0.02));
      setValue(`invoice.invoiceRows.${1}.totalAmount`, twoDecimals(newTotal * 0.02));
      setValue(
        `invoice.invoiceRows.${1}.accountInformation.activity`,
        getValues().invoice.invoiceRows[0].accountInformation.activity
      );
    }
  }, [quantity, activity]);

  useEffect(() => {
    setValue(`invoice.ourReference`, `${user.firstName} ${user.lastName}`);
    if (fields.length === 2) {
      setDevelopment(true);
    }
  }, [fields]);

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
        Utvecklingskostnad?
      </Checkbox>
      {fields.map((field, index) => (
        <div key={field.id} className="bg-blue-50 my-8 px-12 py-12 rounded-24">
          <div className="flex gap-md mt-8">
            <span>{getValues(`invoice.invoiceRows.${index}.descriptions`)}</span>
          </div>
          <div className="flex gap-md mt-8">
            <div className="my-sm w-1/3">
              <FormControl id={`invoice.invoiceRows.${index}-quantity`} className="w-full">
                <FormLabel>Antal timmar</FormLabel>
                <Input
                  {...register(`invoice.invoiceRows.${index}.quantity`)}
                  data-cy="quantity-input"
                  onChange={(e) => {
                    setValue(`invoice.invoiceRows.${index}.quantity`, twoDecimals(parseFloat(e.target.value)));
                  }}
                  className="w-full text-dark-primary"
                  type="number"
                  step={0.01}
                  min={0}
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
              <FormControl id={`invoice.invoiceRows.${index}-costPerUnit`} className="w-full">
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
              <FormControl id={`invoice.invoiceRows.${index}-totalAmount`} className="w-full">
                <FormLabel>Total kostnad</FormLabel>
                <Input
                  {...register(`invoice.invoiceRows.${index}.totalAmount`)}
                  data-cy="totalAmount-input"
                  className="w-full text-dark-primary"
                  type="text"
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
          <div className="my-sm w-full">
            <FormControl id={`invoice.invoiceRows.${index}-totalAmount`} className="w-full">
              <FormLabel>Beskrivning</FormLabel>
              <Input
                {...register(`invoice.invoiceRows.${index}.detailedDescriptions.0`)}
                data-cy={`invoice.invoiceRows.${index}.detailedDescriptions.0-input`}
                className="w-full text-dark-primary"
                type="text"
                size="md"
              />
              <Input
                {...register(`invoice.invoiceRows.${index}.detailedDescriptions.1`)}
                data-cy={`invoice.invoiceRows.${index}.detailedDescriptions.1-input`}
                className="w-full text-dark-primary"
                type="text"
                size="md"
              />
              <Input
                {...register(`invoice.invoiceRows.${index}.detailedDescriptions.2`)}
                data-cy={`invoice.invoiceRows.${index}.detailedDescriptions.2-input`}
                className="w-full text-dark-primary"
                type="text"
                size="md"
              />
              {errors.invoice?.invoiceRows?.[index]?.detailedDescriptions?.[0] && (
                <div className="text-error">
                  <FormErrorMessage>
                    {errors.invoice?.invoiceRows[index]?.detailedDescriptions?.[0]?.message as string}
                  </FormErrorMessage>
                </div>
              )}
            </FormControl>
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
              placeholder={'0'}
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
              placeholder={'0'}
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
