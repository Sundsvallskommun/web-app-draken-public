import { useAppContext } from '@common/contexts/app.context';
import { User } from '@common/interfaces/user';
import { prettyTime } from '@common/services/helper-service';
import { yupResolver } from '@hookform/resolvers/yup';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Divider, FormErrorMessage, Select, Table, useSnackbar } from '@sk-web-gui/react';
import {
  approveBillingRecord,
  billingFormSchema,
  rejectBillingRecord,
  saveBillingRecord,
  setBillingRecordStatus,
} from '@supportmanagement/services/support-billing-service';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { CBillingRecord, CBillingRecordStatusEnum } from 'src/data-contracts/backend/data-contracts';
import { BillingForm } from '../billing/billing-form.component';
import { validateAction } from '@casedata/services/casedata-errand-service';

export const AttestationInvoiceForm: React.FC<{
  setUnsaved?: (boolean) => void;
  update: (recordId: string) => void;
  selectedrecord: CBillingRecord;
}> = (props) => {
  const {
    municipalityId,
    user,
  }: {
    municipalityId: string;
    user: User;
  } = useAppContext();

  const { selectedrecord: selectedRecord } = props;

  const toastMessage = useSnackbar();
  const [showChangeDecisionComponent, setShowDecisionComponent] = useState(false);
  const [invoiceError, setInvoiceError] = useState(false);

  const [allowed, setAllowed] = useState(false);
  // TODO Enable this when errand id is stored on billing record
  // and the rules have been decided
  // useEffect(() => {
  //   const _a = validateAction(supportErrand, user);
  //   setAllowed(_a);
  // }, [user, supportErrand]);

  const formControls = useForm<CBillingRecord>({
    defaultValues: selectedRecord,
    resolver: yupResolver(billingFormSchema),
    mode: 'onSubmit',
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    formState,
    getValues,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = formControls;

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray({
    control, // control props comes from useForm (optional: if you are using FormProvider)
    name: 'invoice.invoiceRows', // unique name for your Field Array
  });

  const onError = () => {
    console.log('getValues()', getValues());
    console.log('errors', errors);
  };

  const onSubmit = () => {
    return saveBillingRecord(undefined, municipalityId, getValues())
      .then(() => {
        toastMessage({
          position: 'bottom',
          closeable: false,
          message: 'Fakturan sparades',
          status: 'success',
        });
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

  const ChangeAttestationDecisionComponent = (p: { status: CBillingRecordStatusEnum }) => {
    return (
      <div className="flex gap-md my-md">
        <Select
          className="w-full"
          // disabled={p.status === CBillingRecordStatusEnum.INVOICED}
          value={p.status}
          onChange={(e) => {
            setValue('status', e.target.value as CBillingRecordStatusEnum, { shouldDirty: true });
            trigger('status');
          }}
        >
          <Select.Option value={CBillingRecordStatusEnum.NEW}>Inget beslut</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.APPROVED}>Godkänn</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.REJECTED}>Avslå</Select.Option>
          <Select.Option value={CBillingRecordStatusEnum.INVOICED}>Fakturerad</Select.Option>
        </Select>
        <Button
          variant="secondary"
          onClick={() => {
            setShowDecisionComponent(false);
            setValue('status', selectedRecord.status);
          }}
        >
          Avbryt
        </Button>
        <Button
          disabled={!isDirty}
          onClick={() => {
            setValue('status', getValues().status);
            setBillingRecordStatus(municipalityId, getValues(), getValues().status, user).then(() => {
              props.update(selectedRecord.id);
              setShowDecisionComponent(false);
            });
          }}
        >
          Spara beslut
        </Button>
      </div>
    );
  };

  const maybe: (s: any) => string = (s) => (s ? s : '(saknas)');

  return (
    <div className="px-40 my-lg gap-24">
      <input type="hidden" {...register('id')} />

      <Table background>
        <Table.Header>
          <Table.HeaderColumn>Ärende</Table.HeaderColumn>
          <Table.HeaderColumn>Registrerad</Table.HeaderColumn>
          <Table.HeaderColumn>Av</Table.HeaderColumn>
          <Table.HeaderColumn>Uppdaterad</Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Column>
              {selectedRecord.extraParameters?.['errandId'] ? (
                <NextLink
                  href={`/arende/${municipalityId}/${selectedRecord.extraParameters?.['errandId']}`}
                  target="_blank"
                  className="underline"
                >
                  {maybe(selectedRecord.extraParameters?.['errandNumber'])}
                </NextLink>
              ) : (
                maybe(selectedRecord.extraParameters?.['errandNumber'])
              )}
            </Table.Column>
            <Table.Column>{prettyTime(selectedRecord.created)}</Table.Column>
            <Table.Column>{maybe(selectedRecord.extraParameters?.['referenceName'])}</Table.Column>
            <Table.Column>{prettyTime(selectedRecord.modified)}</Table.Column>
          </Table.Row>
        </Table.Body>
      </Table>

      <FormProvider {...formControls}>
        <BillingForm recipientName={maybe(selectedRecord.extraParameters?.['referenceName'])} />
      </FormProvider>

      <Divider />

      {selectedRecord.status === CBillingRecordStatusEnum.NEW ? (
        <div className="flex justify-between gap-16 w-full my-lg">
          <div>
            <Button variant="secondary" onClick={handleSubmit(onSubmit, onError)}>
              Spara
            </Button>
          </div>
          <div className="justify-end">
            <Button
              variant="primary"
              color="error"
              className="mr-16"
              onClick={() =>
                rejectBillingRecord(municipalityId, getValues(), user).then(() => props.update(selectedRecord.id))
              }
            >
              Avslå
            </Button>
            <Button
              variant="primary"
              color="gronsta"
              onClick={() =>
                approveBillingRecord(municipalityId, getValues(), user).then(() => props.update(selectedRecord.id))
              }
            >
              Godkänn
            </Button>
          </div>
        </div>
      ) : selectedRecord.status === CBillingRecordStatusEnum.APPROVED ? (
        showChangeDecisionComponent ? (
          <ChangeAttestationDecisionComponent status={getValues().status as CBillingRecordStatusEnum} />
        ) : (
          <div>
            <div className="pt-16 gap-md flex justify-end">
              <Button inverted variant="primary" color="gronsta">
                <LucideIcon name="check" /> Godkänd
              </Button>
              <Button variant="link" className="text-black" onClick={() => setShowDecisionComponent(true)}>
                Ändra beslut
              </Button>
            </div>
            <span className="flex justify-end my-md">
              <span className="text-small">
                <b>Attesterad av:</b> {selectedRecord.approvedBy}, {prettyTime(selectedRecord.approved)}
              </span>
            </span>
          </div>
        )
      ) : selectedRecord.status === CBillingRecordStatusEnum.REJECTED ? (
        showChangeDecisionComponent ? (
          <ChangeAttestationDecisionComponent status={getValues().status as CBillingRecordStatusEnum} />
        ) : (
          <div>
            <div className="pt-16 gap-md flex justify-end">
              <Button inverted variant="primary" color="error">
                <LucideIcon name="thumbs-down" /> Avslag
              </Button>
              <Button variant="link" className="text-black" onClick={() => setShowDecisionComponent(true)}>
                Ändra beslut
              </Button>
            </div>
            <span className="flex justify-end my-md">
              <span className="text-small">
                <b>Attesterad av:</b> {selectedRecord.approvedBy}, {prettyTime(selectedRecord.approved)}
              </span>
            </span>
          </div>
        )
      ) : showChangeDecisionComponent ? (
        <ChangeAttestationDecisionComponent status={getValues().status as CBillingRecordStatusEnum} />
      ) : (
        <div>
          <div className="pt-16 gap-md flex justify-end">
            <Button inverted variant="primary" color="vattjom">
              <LucideIcon name="check" /> Fakturerad
            </Button>
            <Button variant="link" className="text-black" onClick={() => setShowDecisionComponent(true)}>
              Ändra beslut
            </Button>
          </div>
          <span className="flex justify-end my-md">
            <span className="text-small">
              <b>Attesterad av:</b> {selectedRecord.approvedBy}, {prettyTime(selectedRecord.approved)}
            </span>
          </span>
        </div>
      )}
      <div className="my-sm">
        {invoiceError && (
          <FormErrorMessage className="text-error">Något gick fel när fakturan skulle sparas</FormErrorMessage>
        )}
      </div>
    </div>
  );
};
