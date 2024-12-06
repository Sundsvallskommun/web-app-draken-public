import { User } from '@common/interfaces/user';
import { searchADUser } from '@common/services/adress-service';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  RadioButton,
  Select,
  useSnackbar,
} from '@sk-web-gui/react';
import { BillingForm } from '@supportmanagement/components/billing/billing-form.component';
import {
  customerIdentities,
  emptyBillingRecord,
  getBillingRecord,
  getEmployeeCustomerIdentity,
  getEmployeeData,
  getEmployeeOrganizationId,
  invoiceActivities,
  InvoiceFormModel,
  invoiceTypes,
  recordToFormModel,
  saveInvoice,
} from '@supportmanagement/services/support-billing-service';
import {
  ApiSupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { CBillingRecord, CRecipient } from 'src/data-contracts/backend/data-contracts';
import * as yup from 'yup';

let formSchema = yup.object({
  id: yup.string(),
  // costPerUnit: yup.number().typeError('Ange ett giltigt värde'),
  // recipient: yup.object().required('Fyll i chef'),
  // errandId: yup.string().required('Fyll i ärende-id'),
  type: yup.string().required('Fyll i faktureringstyp'),
  invoice: yup.object({
    customerId: yup.string().required('Fyll i kundidentitet'),
    customerReference: yup.string().required('Fyll i referensnummer'),
    invoiceRows: yup.array().of(
      yup.object({
        quantity: yup
          .string()
          .test('isnumber', 'Ange i format 1.23', (q) => {
            return /^\d*\.?\d{0,2}$/g.test(q);
          })
          .test('positivt', 'Måste vara 0 eller större', (q) => parseFloat(q) > 0)
          .required('Fyll i antal timmar'),
        costPerUnit: yup.string().required('Fyll i timpris'),
        totalAmount: yup.number().typeError('Måste vara ett tal över noll'),
        accountInformation: yup.object({
          activity: yup
            .mixed<string>()
            .required('Välj aktivitet')
            .oneOf(
              invoiceActivities.map((a) => a.value),
              'Välj aktivitet'
            ),
        }),
      })
    ),
  }),
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

  const [record, setRecord] = useState<CBillingRecord | undefined>(emptyBillingRecord);
  const [recordFormModel, setRecordFormModel] = useState<InvoiceFormModel | undefined>(recordToFormModel());
  const [recipientName, setRecipientname] = useState<string>('');
  // const [development, setDevelopment] = useState<boolean>(false);
  // const [developmentCost, setDevelopmentCost] = useState<number>(0);

  useEffect(() => {
    // setValue('errandId', supportErrand.id);
    console.log('running callback for errand: ', supportErrand);
    const manager = supportErrand.stakeholders.find((s) => s.role === 'MANAGER');
    console.log('FOund manager', manager);
    // setValue('recipient', `${manager?.firstName} ${manager?.lastName}` || '');
    const managerUserName = manager?.parameters?.find((param) => param.key === 'username')?.values[0] || null;
    if (managerUserName) {
      getEmployeeData(managerUserName).then((res) => {
        setValue('invoice.customerReference', res.referenceNumber);
      });
      getEmployeeCustomerIdentity(managerUserName).then((res) => {
        console.log(res);
        setValue('invoice.customerId', res.customerId);
      });
      // const recipient: CRecipient = {
      //   partyId: manager?.externalId || '',
      //   firstName: manager?.firstName || '',
      //   lastName: manager?.lastName || '',
      //   userId: managerUserName || '',
      //   addressDetails: {},
      // };
      // setValue('recipient', recipient);
      setRecipientname(`${manager?.firstName} ${manager?.lastName}` || '');
    }
    if (supportErrand && supportErrand.externalTags?.['billingRecordId']) {
      const recordId = supportErrand.externalTags['billingRecordId'];
      getBillingRecord(recordId, municipalityId).then(setRecord);
      // getBillingRecord(recordId, municipalityId).then(recordToFormModel).then(setRecordFormModel);
      // setRecordFormModel(recordFormModel);
    } else {
      setRecord(emptyBillingRecord);
      // setRecordFormModel(recordToFormModel());
    }
  }, [supportErrand]);

  // const formControls = useForm<InvoiceFormModel>({
  const formControls = useForm<CBillingRecord>({
    defaultValues: record,
    resolver: yupResolver(formSchema),
    mode: 'onChange',
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = formControls;

  // const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
  //   control,
  //   name: 'invoice.invoiceRows',
  // });

  // useEffect(() => {
  //   const newTotal = getValues(`invoice.invoiceRows.${0}.quantity`) * getValues(`invoice.invoiceRows.${0}.costPerUnit`);
  //   setValue(`invoice.invoiceRows.${0}.totalAmount`, newTotal);
  //   setDevelopmentCost(newTotal * 0.02);
  //   if (fields.length > 1) {
  //     setValue(`invoice.invoiceRows.${1}.totalAmount`, newTotal * 0.02);
  //   }
  // }, [getValues().invoice.invoiceRows[0].quantity]);

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
    return saveInvoice(supportErrand.id, municipalityId, getValues())
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fakturan sparades',
          status: 'success',
        });
        getSupportErrandById(supportErrand.id, municipalityId).then((res) => setSupportErrand(res.errand));
      })
      .catch(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Något gick fel när fakturan sparades',
          status: 'error',
        });
      });
  };

  // const handleDevelopmentCost = (checked) => {
  //   console.log('checked', checked);
  //   if (checked) {
  //     append({
  //       descriptions: ['Utvecklingskostnad'],
  //       quantity: 1,
  //       costPerUnit: developmentCost,
  //       totalAmount: developmentCost,
  //       accountInformation: {
  //         project: '11041',
  //       },
  //     });
  //   } else {
  //     remove(fields.length - 1);
  //   }
  //   setDevelopment(checked);
  // };
  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Fakturering</h2>
        <span>Fyll i följande faktureringsunderlag.</span>
        <div>{JSON.stringify(getValues())}</div>
        <FormProvider {...formControls}>
          <BillingForm recipientName={recipientName} />
        </FormProvider>
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
