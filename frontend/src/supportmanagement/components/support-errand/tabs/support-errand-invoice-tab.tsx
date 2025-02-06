import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, useSnackbar } from '@sk-web-gui/react';
import { BillingForm } from '@supportmanagement/components/billing/billing-form.component';
import { invoiceSettings } from '@supportmanagement/services/invoiceSettings';
import {
  emptyBillingRecord,
  billingFormSchema,
  getBillingRecord,
  getEmployeeCustomerIdentity,
  getEmployeeData,
  saveBillingRecord,
  getInvoiceRows,
  getOrganization,
} from '@supportmanagement/services/support-billing-service';
import {
  ApiSupportErrand,
  getSupportErrandById,
  isSupportErrandLocked,
  SupportErrand,
  validateAction,
} from '@supportmanagement/services/support-errand-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import {
  CBillingRecord,
  CBillingRecordStatusEnum,
  CBillingRecordTypeEnum,
  CInvoiceRow,
} from 'src/data-contracts/backend/data-contracts';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const existingRecordId =
      supportErrand && supportErrand.externalTags?.find((t) => t.key === 'billingRecordId')?.value;
    if (existingRecordId) {
      getBillingRecord(existingRecordId, municipalityId).then((rec) => {
        setRecord(rec);
        setRecipientname(rec.extraParameters['referenceName'] || '');
        reset(rec);
        setTimeout(() => {
          handleDescriptionChange(rec.invoice.description, rec.invoice.customerId);
        }, 0);
      });
    } else {
      setRecord(emptyBillingRecord);
      setValue(`invoice.ourReference`, `${user.firstName} ${user.lastName}`);
      setValue(`invoice.invoiceRows.${0}.descriptions.0`, `Ärendenummer: ${supportErrand.errandNumber}`);
      const manager = supportErrand.stakeholders?.find((s) => s.role === 'MANAGER');
      const managerUserName = manager?.parameters?.find((param) => param.key === 'username')?.values[0] || null;
      if (managerUserName) {
        // getEmployeeData(managerUserName).then((res) => {
        //   setValue('invoice.customerReference', res.referenceNumber);
        // });
        getEmployeeCustomerIdentity(managerUserName).then((res) => {
          if (res.type === 'INTERNAL') {
            setValue('type', CBillingRecordTypeEnum.INTERNAL);
            setValue('invoice.customerId', res.identity.customerId.toString());
          } else if (res.type === 'EXTERNAL') {
            setValue('type', CBillingRecordTypeEnum.EXTERNAL);
            setValue('invoice.customerId', res.identity.name);
            setValue('recipient.organizationName', res.identity.name);
            // Fetch partyId for res.identity.orgNr from Party
            console.log('res.identity.orgNr: ', res.identity.orgNr);
            getOrganization(res.identity.orgNr).then((org) => {
              console.log('org: ', org);
              console.log('Setting partyId: ', org.partyId);
              setValue('recipient.partyId', org.partyId);
              setValue('recipient.addressDetails', {
                city: org?.address?.city,
                street: org?.address?.street,
                careOf: org?.address?.careOf,
                postalCode: org?.address?.postcode,
              });
            });
          }
          setValue('invoice.customerReference', res.referenceNumber);
          handleDescriptionChange(
            invoiceSettings.invoiceTypes[0].invoiceType,
            res.type === 'INTERNAL' ? res.identity.customerId.toString() : res.identity.name
          );
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

  const handleDescriptionChange = (description: string, identity: string) => {
    setValue('invoice.description', description);
    const formRows = getInvoiceRows(
      supportErrand.errandNumber,
      description,
      getValues('type'),
      identity
      //getValues('invoice.customerId')
    );
    setValue('invoice.invoiceRows', formRows);
  };

  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const _a = validateAction(supportErrand, user) && record?.status === CBillingRecordStatusEnum.NEW;
    setAllowed(_a);
  }, [user, supportErrand]);

  const onError = (error) => {
    console.log('error', error);
  };

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
          <BillingForm
            recipientName={recipientName}
            handleDescriptionChange={handleDescriptionChange}
            setIsLoading={setIsLoading}
          />
        </FormProvider>
        <div className="flex flex-row justify-end">
          {record.status === CBillingRecordStatusEnum.NEW ? (
            <div>
              <Button
                disabled={isSupportErrandLocked(supportErrand) || !allowed || isLoading}
                onClick={handleSubmit(onSubmit, onError)}
                data-cy="save-invoice-button"
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
