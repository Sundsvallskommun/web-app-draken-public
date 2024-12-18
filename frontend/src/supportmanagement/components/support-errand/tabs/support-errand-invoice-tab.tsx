import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useSnackbar } from '@sk-web-gui/react';
import { BillingForm } from '@supportmanagement/components/billing/billing-form.component';
import {
  emptyBillingRecord,
  billingFormSchema,
  getBillingRecord,
  getEmployeeCustomerIdentity,
  getEmployeeData,
  saveBillingRecord,
} from '@supportmanagement/services/support-billing-service';
import {
  ApiSupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CBillingRecord, CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';

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
  const [recipientName, setRecipientname] = useState<string>('');

  useEffect(() => {
    const existingRecordId =
      supportErrand && supportErrand.externalTags?.find((t) => t.key === 'billingRecordId')?.value;
    if (existingRecordId) {
      getBillingRecord(existingRecordId, municipalityId).then((rec) => {
        setRecord(rec);
        setRecipientname(rec.extraParameters['referenceName'] || '');
        reset(rec);
      });
    } else {
      setRecord(emptyBillingRecord);
      setValue(`invoice.invoiceRows.${0}.descriptions.0`, `Ärendenummer: LoP-${supportErrand.errandNumber}`);
      const manager = supportErrand.stakeholders?.find((s) => s.role === 'MANAGER');
      const managerUserName = manager?.parameters?.find((param) => param.key === 'username')?.values[0] || null;
      if (managerUserName) {
        getEmployeeData(managerUserName).then((res) => {
          setValue('invoice.customerReference', res.referenceNumber);
        });
        getEmployeeCustomerIdentity(managerUserName).then((res) => {
          setValue('invoice.customerId', res.customerId);
        });
        setRecipientname(`${manager?.firstName} ${manager?.lastName}` || '');
        setValue(`extraParameters`, {
          errandNumber: supportErrand.errandNumber,
          errandId: supportErrand.id,
          referenceName: `${manager?.firstName} ${manager?.lastName}`,
        });
      }
    }
  }, [supportErrand]);

  const formControls = useForm<CBillingRecord>({
    defaultValues: record,
    resolver: yupResolver(billingFormSchema),
    mode: 'onSubmit',
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

  const toastMessage = useSnackbar();

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(supportErrand, user) && record?.status === CBillingRecordStatusEnum.NEW;
    setAllowed(_a);
  }, [user, supportErrand]);

  const onError = () => {};

  const onSubmit = () => {
    return saveBillingRecord(supportErrand, municipalityId, getValues())
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

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Fakturering</h2>
        <span>Fyll i följande faktureringsunderlag.</span>
        <FormProvider {...formControls}>
          <BillingForm recipientName={recipientName} />
        </FormProvider>
        <div className="flex flex-row justify-end">
          {record.status === CBillingRecordStatusEnum.NEW ? (
            <div>
              <Button
                disabled={isSupportErrandLocked(supportErrand) || !allowed}
                onClick={handleSubmit(onSubmit, onError)}
              >
                Spara
              </Button>
            </div>
          ) : record.status === CBillingRecordStatusEnum.REJECTED ? (
            <Button inverted variant="primary" color="error">
              <LucideIcon name="thumbs-down" /> Avslag
            </Button>
          ) : record.status === CBillingRecordStatusEnum.APPROVED ? (
            <Button inverted variant="primary" color="gronsta">
              <LucideIcon name="check" /> Godkänd
            </Button>
          ) : record.status === CBillingRecordStatusEnum.INVOICED ? (
            <Button disabled inverted variant="primary" color="vattjom">
              <LucideIcon name="check" /> Fakturerad
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
