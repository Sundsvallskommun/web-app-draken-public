import { twoDecimals } from '@common/services/helper-service';
import { FormControl, FormErrorMessage, FormLabel, Input, RadioButton, Select } from '@sk-web-gui/react';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import { getOrganization } from '@supportmanagement/services/support-billing-service';
import { useFormContext } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

export const BillingForm = ({ recipientName, handleDescriptionChange, setIsLoading }) => {
  const {
    control,
    register,
    getValues,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useFormContext<CBillingRecord>();

  return (
    <>
      <div className="my-lg gap-xl">
        <FormControl>
          <FormLabel>Faktureringstyp</FormLabel>
          <Select
            {...register('invoice.description')}
            data-cy="activity-input"
            className="w-full text-dark-primary"
            size="md"
            placeholder={'0'}
            onChange={(e) => {
              handleDescriptionChange(e.target.value, getValues().invoice.customerId);
              trigger();
            }}
          >
            <Select.Option value={''}>Välj faktureringstyp</Select.Option>
            {invoiceSettings.invoiceTypes.map((invoiceType) => (
              <Select.Option key={invoiceType.invoiceType} value={invoiceType.invoiceType}>
                {invoiceType.invoiceType}
              </Select.Option>
            ))}
          </Select>
          {errors.invoice?.description && (
            <div className="text-error">
              <FormErrorMessage>{errors.invoice?.description.message}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>

      {watch('invoice.invoiceRows').map((row, index) => (
        <div key={`row-${index}`} className="bg-blue-50 my-8 px-12 py-12 rounded-24">
          <div className="flex gap-md mt-8">
            <span>{row.descriptions?.[0]}</span>
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
                    setValue(
                      `invoice.invoiceRows.${index}.totalAmount`,
                      twoDecimals(row.costPerUnit * row.quantity) || 0
                    );
                  }}
                  className="w-full text-dark-primary"
                  type="number"
                  step={0.01}
                  min={0}
                  size="md"
                />
                {errors.invoice?.invoiceRows?.[index]?.quantity && (
                  <div className="text-error">
                    <FormErrorMessage>{errors.invoice?.invoiceRows[index]?.quantity?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>

            <div className="my-sm gap-xl w-1/3">
              <FormControl id={`invoice.invoiceRows.${index}.costPerUnit`} className="w-full">
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
          {row.accountInformation?.map((accountInformation, accountIndex) => (
            <div key={accountIndex} className="my-sm w-full">
              <FormControl id={`invoice.invoiceRows.${index}-totalAmount`} className="w-full">
                <FormLabel>Kontoinformation</FormLabel>
                <span>costCenter (från metadata.activity): {accountInformation?.costCenter}</span>
                <span>subaccount (från metadata): {accountInformation?.subaccount}</span>
                <span>department (från metadata): {accountInformation?.department}</span>
                <span>activity (från metadata.activity): {accountInformation?.activity}</span>
                <span>project (från metadata): {accountInformation?.project}</span>
                <span>counterpart (från metadata): {accountInformation?.counterpart}</span>
                <span>amount (beräknas): {accountInformation?.amount}</span>
              </FormControl>
            </div>
          ))}
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
              onChange={(e) => {
                console.log('Kundidentitet change: ', e.target.value);
                setValue('invoice.customerId', e.target.value);
                if (getValues('type') === 'EXTERNAL') {
                  setValue('recipient.organizationName', e.target.value);
                  const selectedIdentity = invoiceSettings.customers.external.find(
                    (identity) => identity.name === e.target.value
                  );
                  console.log('Selected identity: ', selectedIdentity);
                  setIsLoading(true);
                  getOrganization(selectedIdentity.orgNr).then((org) => {
                    setIsLoading(false);
                    console.log('org: ', org);
                    console.log('Setting partyId: ', org.partyId);
                    setValue('recipient.partyId', org.partyId);
                    console.log('Setting recipient.addressDetails: ', {
                      city: org?.address?.city,
                      street: org?.address?.street,
                      careOf: org?.address?.careOf,
                      postalCode: org?.address?.postcode,
                    });
                    setValue('recipient.addressDetails', {
                      city: org?.address?.city,
                      street: org?.address?.street,
                      careOf: org?.address?.careOf,
                      postalCode: org?.address?.postcode,
                    });
                  });
                } else {
                  setValue('recipient', undefined);
                }
                handleDescriptionChange(getValues('invoice.description'), e.target.value);
              }}
              placeholder={'0'}
            >
              {getValues().type === 'INTERNAL'
                ? invoiceSettings.customers.internal.map((identity) => (
                    <Select.Option key={identity.customerId} value={identity.customerId}>
                      {identity.name}
                    </Select.Option>
                  ))
                : getValues().type === 'EXTERNAL'
                ? invoiceSettings.customers.external.map((identity) => (
                    <Select.Option key={identity.orgNr || identity.companyId} value={identity.name}>
                      {identity.name}
                    </Select.Option>
                  ))
                : null}
            </Select>
            {errors.invoice?.customerId && (
              <div className="text-error">
                <FormErrorMessage>{errors.invoice.customerId?.message}</FormErrorMessage>
              </div>
            )}
            {getValues().recipient ? (
              <div>
                Vald kund:
                <p>PartyID: {getValues().recipient.partyId}</p>
                <p>{getValues().recipient.organizationName}</p>
                <p>{getValues().recipient.addressDetails?.careOf}</p>
                <p>{getValues().recipient.addressDetails?.street}</p>
                <p>
                  {getValues().recipient.addressDetails?.postalCode} {getValues().recipient.addressDetails?.city}
                </p>
              </div>
            ) : null}
          </FormControl>
        </div>

        <div className="w-1/2">
          <FormControl id="category" className="w-full">
            <FormLabel>Aktivitet</FormLabel>
            <Select
              {...register('invoice.invoiceRows.0.accountInformation.0.activity')}
              data-cy="activity-input"
              className="w-full text-dark-primary"
              onChange={(e) => {
                getValues('invoice.invoiceRows.0.accountInformation').forEach((accountInformation, index) => {
                  setValue(`invoice.invoiceRows.0.accountInformation.${index}.activity`, e.target.value);
                });
              }}
              size="md"
              placeholder={'0'}
            >
              <Select.Option value={''}>Välj aktivitet</Select.Option>
              {invoiceSettings.activities.map((activity) => (
                <Select.Option key={activity.name} value={activity.value}>
                  {activity.name}
                </Select.Option>
              ))}
            </Select>
            {errors.invoice?.invoiceRows?.[0]?.accountInformation?.[0]?.activity && (
              <div className="text-error">
                <FormErrorMessage>
                  {errors.invoice?.invoiceRows?.[0]?.accountInformation?.[0]?.activity.message}
                </FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      </div>
      <div>
        <span> {JSON.stringify(watch())}</span>
      </div>
    </>
  );
};
