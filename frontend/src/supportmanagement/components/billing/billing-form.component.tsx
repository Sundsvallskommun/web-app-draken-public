import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, FormControl, FormErrorMessage, FormLabel, Input, Select, Table } from '@sk-web-gui/react';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import { getOrganization } from '@supportmanagement/services/support-billing-service';
import { useFormContext } from 'react-hook-form';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

const BillingForm: React.FC<{
  resetManager?: () => void;
  handleChange: (
    description: string,
    customerId: string,
    quantity: number,
    costCenter: string,
    activity: string
  ) => void;
  setIsLoading: (isLoading: boolean) => void;
}> = ({ resetManager, handleChange, setIsLoading }) => {
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
      <FormControl>
        <FormLabel>Faktureringstyp</FormLabel>
        <Select
          {...register('invoice.description')}
          data-cy="invoice-description-input"
          className="w-full text-dark-primary"
          size="md"
          placeholder={'0'}
          onChange={(e) => {
            const selectedInvoiceType = invoiceSettings.invoiceTypes.find((t) => t.invoiceType === e.target.value);
            const selectedDescription = e.target.value;
            const customerId = getValues().invoice.customerId;
            const isInternal = getValues().type === 'INTERNAL';
            const defaultQuantity = 1;
            const costcenter = isInternal
              ? selectedInvoiceType?.internal.accountInformation.costCenter
              : selectedInvoiceType?.external.accountInformation.costCenter;
            const activity = isInternal
              ? selectedInvoiceType?.internal.accountInformation.activity
              : selectedInvoiceType?.external.accountInformation.activity;
            handleChange(selectedDescription, customerId, defaultQuantity, costcenter, activity);
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

      <FormControl id={`invoice.invoiceRows.${0}-quantity`}>
        <FormLabel>Antal</FormLabel>
        <Input
          {...register(`invoice.invoiceRows.${0}.quantity`)}
          data-cy="quantity-input"
          onChange={(e) => {
            handleChange(
              getValues('invoice.description'),
              getValues('invoice.customerId'),
              parseFloat(e.target.value),
              getValues('invoice.invoiceRows.0.accountInformation.0.costCenter'),
              getValues('invoice.invoiceRows.0.accountInformation.0.activity')
            );
          }}
          className="w-full text-dark-primary"
          type="number"
          step={0.01}
          min={0}
          max={999999}
          size="md"
        />
        {errors.invoice?.invoiceRows?.[0]?.quantity && (
          <div className="text-error">
            <FormErrorMessage>{errors.invoice?.invoiceRows[0]?.quantity?.message}</FormErrorMessage>
          </div>
        )}
      </FormControl>

      <Table dense background data-cy="seller-table">
        <Table.Header>
          <Table.HeaderColumn>Beskrivning</Table.HeaderColumn>
          <Table.HeaderColumn>Antal</Table.HeaderColumn>
          <Table.HeaderColumn>Pris</Table.HeaderColumn>
          <Table.HeaderColumn>Summa</Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {watch('invoice.invoiceRows').map((row, index) => {
            return (
              <Table.Row key={`row-${index}`}>
                <Table.Column>
                  <div>{row.descriptions?.[0]}</div>
                  <div>
                    ({getValues(`invoice.invoiceRows.${index}.accountInformation.0.costCenter`)},{' '}
                    {getValues(`invoice.invoiceRows.${index}.accountInformation.0.activity`)})
                  </div>
                </Table.Column>
                <Table.Column>{getValues(`invoice.invoiceRows.${index}.quantity`)}</Table.Column>
                <Table.Column>{getValues(`invoice.invoiceRows.${index}.costPerUnit`)}</Table.Column>
                <Table.Column>{getValues(`invoice.invoiceRows.${index}.totalAmount`)}</Table.Column>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
      <div className="flex mb-md gap-24">
        <div className="flex w-1/2">
          <FormControl id="supervisor" className="w-full">
            <FormLabel>Chef</FormLabel>
            <Input.Group>
              <Input
                data-cy="manager-input"
                className="w-full text-dark-primary"
                readOnly={getValues().status !== 'NEW'}
                {...register('extraParameters.referenceName')}
                size="md"
              />
              {resetManager && getValues().status === 'NEW' ? (
                <Input.RightAddin>
                  <Button iconButton variant="ghost" onClick={resetManager}>
                    <LucideIcon name="refresh-ccw" />
                  </Button>
                </Input.RightAddin>
              ) : null}
            </Input.Group>
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
              readOnly={getValues().status !== 'NEW'}
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
                setValue('invoice.customerId', e.target.value);
                if (getValues('type') === 'EXTERNAL') {
                  setValue('recipient.organizationName', e.target.value);
                  const selectedIdentity = invoiceSettings.customers.external.find(
                    (identity) => identity.name === e.target.value
                  );
                  setIsLoading(true);
                  getOrganization(selectedIdentity.orgNr).then(({ partyId, address }) => {
                    setIsLoading(false);
                    setValue('recipient.partyId', partyId);
                    setValue('recipient.addressDetails', address);
                  });
                } else {
                  setValue('recipient', undefined);
                }
                handleChange(
                  getValues('invoice.description'),
                  e.target.value,
                  1,
                  getValues('invoice.invoiceRows.0.accountInformation.0.costCenter'),
                  getValues('invoice.invoiceRows.0.accountInformation.0.activity')
                );
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
                const selectedActivity = invoiceSettings.activities.find((a) => a.value === e.target.value);
                if (!selectedActivity) {
                  return;
                }

                const selectedDescription = getValues('invoice.description');
                const customerId = getValues('invoice.customerId');
                const costcenter = selectedActivity.costCenter;
                const quantity = getValues('invoice.invoiceRows.0.quantity');
                handleChange(selectedDescription, customerId, quantity, costcenter, selectedActivity.value);
                getValues('invoice.invoiceRows').forEach((row, index) => {
                  row.accountInformation.forEach((accountInformation, accountIndex) => {
                    setValue(
                      `invoice.invoiceRows.${index}.accountInformation.${accountIndex}.activity`,
                      selectedActivity.value
                    );
                  });
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
      {/* <div>
        <span> {JSON.stringify(watch())}</span>
      </div> */}
    </>
  );
};

export default BillingForm;
