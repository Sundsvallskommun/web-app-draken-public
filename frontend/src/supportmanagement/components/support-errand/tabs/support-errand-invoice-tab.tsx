import { User } from '@common/interfaces/user';
import { searchADUser } from '@common/services/adress-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  RadioButton,
  Select,
  useSnackbar,
} from '@sk-web-gui/react';
import {
  customerIdentities,
  getBillingRecord,
  getEmployeeCustomerIdentity,
  getEmployeeData,
  getEmployeeOrganizationId,
  invoiceActivities,
  InvoiceFormModel,
  invoiceTypes,
  recordToFormModel,
} from '@supportmanagement/services/support-billing-service';
import {
  ApiSupportErrand,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

let formSchema = yup.object({
  id: yup.string(),
  costPerUnit: yup.number().typeError('Ange ett giltigt värde'),
  manager: yup.string().required('Fyll i chef'),
  referenceNumber: yup.string().required('Fyll i referensnummer'),
  errandId: yup.string().required('Fyll i ärende-id'),
  customerId: yup.string().required('Fyll i kundidentitet'),
  activity: yup.string().required('Fyll i aktivitet'),
  type: yup.string().required('Fyll i faktureringstyp'),
  quantity: yup
    .string()
    // .matches(/\d/, 'Ange ett giltigt värde')
    // .required('Fyll i antal timmar')
    .test('isnumber', 'Ange i format 1.23', (q) => {
      console.log('q', q);
      return /^\d*\.?\d{0,2}$/g.test(q);
    })
    .test('positivt', 'Måste vara 0 eller större', (q) => parseFloat(q) > 0),
  totalAmount: yup.number().typeError('Måste vara ett tal över noll'),
  registeredBy: yup.string(),
  approvedBy: yup.string(),
  status: yup.string(),
});

export const SupportErrandInvoiceTab: React.FC<{
  errand: ApiSupportErrand;
  setUnsaved: (unsaved: boolean) => void;
  update: () => void;
}> = (props) => {
  const {
    supportErrand,
    user,
    municipalityId,
    setSupportErrand,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (e: SupportErrand) => void;
    user: User;
  } = useAppContext();

  const [recordFormModel, setRecordFormModel] = useState<InvoiceFormModel | undefined>(recordToFormModel());

  useEffect(() => {
    setValue('errandId', supportErrand.id);
    console.log('running callback for errand: ', supportErrand);
    const manager = supportErrand.stakeholders.find((s) => s.role === 'MANAGER');
    console.log('FOund manager', manager);
    setValue('manager', `${manager?.firstName} ${manager?.lastName}` || '');
    const managerUserName = manager.parameters?.find((param) => param.key === 'username')?.values[0] || null;
    getEmployeeData(managerUserName).then((res) => {
      setValue('referenceNumber', res.referenceNumber);
    });
    getEmployeeCustomerIdentity(managerUserName).then((res) => {
      console.log(res);
      setValue('customerId', res.customerId);
    });
    if (supportErrand && supportErrand.externalTags?.['billingRecordId']) {
      const recordId = supportErrand.externalTags['billingRecordId'];
      getBillingRecord(recordId, municipalityId).then(recordToFormModel).then(setRecordFormModel);
      setRecordFormModel(recordFormModel);
    } else {
      setRecordFormModel(recordToFormModel());
    }
  }, [supportErrand]);

  const formControls = useForm<InvoiceFormModel>({
    defaultValues: recordFormModel,
    resolver: yupResolver(formSchema),
    mode: 'onChange',
  });

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    formState: { errors },
  } = formControls;

  const toastMessage = useSnackbar();

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(supportErrand, user);
    setAllowed(_a);
  }, [user, supportErrand]);

  const onError = () => {
    console.log('getValues()', getValues());
    console.log('errors', errors);
  };

  const onSubmit = () => {
    const formData = getValues();
    console.log('formData', formData);

    // const apiCall = updateSupportInvoice(supportErrand.id, municipalityId, formData);

    // return apiCall
    //   .then(() => {
    //     toastMessage({
    //       position: 'bottom',
    //       closeable: false,
    //       message: 'Fakturan sparades',
    //       status: 'success',
    //     });
    //     getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
    //   })
    //   .catch(() => {
    //     toastMessage({
    //       position: 'bottom',
    //       closeable: false,
    //       message: 'Något gick fel när fakturan sparades',
    //       status: 'error',
    //     });
    //   });
  };

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Fakturering</h2>
        <span>Fyll i följande faktureringsunderlag.</span>
        <div>{JSON.stringify(recordFormModel)}</div>

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
                      {...register('type')}
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

        <div className="flex gap-md mt-16">
          <div className="my-sm w-1/2">
            <FormControl id="quantity" className="w-full">
              <div>GV: {getValues().quantity}</div>
              <div>PF: {parseFloat(getValues().quantity)}</div>
              <FormLabel>Antal timmar</FormLabel>
              <Input
                {...register('quantity')}
                data-cy="quantity-input"
                className="w-full text-dark-primary"
                type="text"
                // inputMode="numeric"
                // pattern="\d*[,.]?\d{0,2}"
                // type="number"
                // step={0.01}
                // min={0}
                size="md"
                value={getValues().quantity}
                onChange={(e) => {
                  setValue('quantity', e.target.value);
                  trigger('quantity');
                }}
              />
              {errors.quantity && (
                <div className="text-error">
                  <FormErrorMessage>{errors.quantity?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>

          <div className="my-sm gap-xl w-1/2">
            <FormControl id="costPerUnit" className="w-full">
              <FormLabel>Timpris</FormLabel>
              <Input
                {...register('costPerUnit')}
                data-cy="costPerUnit-input"
                className="w-full text-dark-primary"
                size="md"
                value={getValues().costPerUnit}
                placeholder={'0'}
                onChange={(e) => {
                  setValue('costPerUnit', e.target.value);
                  trigger('costPerUnit');
                }}
                disabled
              />
              {errors.costPerUnit && (
                <div className="text-error">
                  <FormErrorMessage>{errors.costPerUnit?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>
        </div>

        <div className="flex mb-md gap-24">
          <div className="flex w-1/2">
            <FormControl id="supervisor" className="w-full">
              <FormLabel>Chef</FormLabel>
              <Input
                {...register('manager')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
                data-cy="manager-input"
                className="w-full text-dark-primary"
                size="md"
                // value={getValues('manager')}
                // onChange={(e) => {
                //   setValue('manager', e.target.value);
                //   trigger('manager');
                // }}
              />
              {errors.manager ? (
                <div className="text-error">
                  <FormErrorMessage>{errors.manager?.message}</FormErrorMessage>
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
                {...register('referenceNumber')}
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
                data-cy="referenceNumber-input"
                className="w-full text-dark-primary"
                size="md"
                // value={getValues().referenceNumber}
                // onChange={(e) => {
                //   setValue('referenceNumber', e.target.value);
                //   trigger('referenceNumber');
                // }}
              />
              {errors.referenceNumber ? (
                <div className="text-error">
                  <FormErrorMessage>{errors.referenceNumber?.message}</FormErrorMessage>
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
                {...register('customerId')}
                data-cy="customerId-input"
                className="w-full text-dark-primary"
                size="md"
                value={getValues('customerId')}
                placeholder={'0'}
                onChange={(e) => {
                  setValue('customerId', e.target.value);
                  trigger('customerId');
                }}
              >
                {customerIdentities.map((identity) => (
                  <Select.Option key={identity.customerId} value={identity.customerId}>
                    {identity.customerName}
                  </Select.Option>
                ))}
              </Select>
              {errors.customerId && (
                <div className="text-error">
                  <FormErrorMessage>{errors.customerId?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>

          <div className="w-1/2">
            <FormControl id="category" className="w-full">
              <FormLabel>Aktivitet</FormLabel>
              <Select
                {...register('activity')}
                data-cy="activity-input"
                className="w-full text-dark-primary"
                size="md"
                value={getValues('activity')}
                placeholder={'0'}
                onChange={(e) => {
                  setValue('activity', e.target.value);
                  trigger('activity');
                }}
              >
                <Select.Option value={undefined}>Välj aktivitet</Select.Option>
                {invoiceActivities.map((activity) => (
                  <Select.Option key={activity.id} value={activity.value}>
                    {activity.displayName}
                  </Select.Option>
                ))}
              </Select>
              {errors.activity && (
                <div className="text-error">
                  <FormErrorMessage>{errors.activity?.message}</FormErrorMessage>
                </div>
              )}
            </FormControl>
          </div>
        </div>

        <div>
          <Button
            className="mr-12"
            variant="secondary"
            disabled={isSupportErrandLocked(supportErrand) || !allowed}
            onClick={() => reset()}
          >
            Rensa formulär
          </Button>
          <Button disabled={isSupportErrandLocked(supportErrand) || !allowed} onClick={handleSubmit(onSubmit, onError)}>
            Spara
          </Button>
        </div>
      </div>
    </div>
  );
};
