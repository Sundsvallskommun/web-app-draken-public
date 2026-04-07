import { ContractInvoicesTable } from '@casedata/components/contract-overview/contract-invoices-table.component';
import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import { ContractType, IntervalType, StakeholderRole, Status, TimeUnit } from '@casedata/interfaces/contracts';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { getSSNFromPersonId } from '@casedata/services/casedata-stakeholder-service';
import {
  getContractStakeholderName,
  getErrandPropertyInformation,
  hasRecurringFee,
  isLeaseAgreement,
  prettyContractRoles,
} from '@casedata/services/contract-service';
import { useAppContext } from '@contexts/app.context';
import {
  Button,
  Checkbox,
  Disclosure,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  Label,
  RadioButton,
  Select,
  Table,
  Textarea,
} from '@sk-web-gui/react';
import { Calendar, FilePen, Info, MapPin, Receipt, RefreshCcw, Users, Wallet } from 'lucide-react';
import { ChangeEvent, FC, useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { ContractAttachments } from './contract-attachments';

export const ContractForm: FC<{
  changeBadgeColor?: (badgeId: string) => void;
  onSave?: (data: ContractData) => Promise<void>;
  readOnly?: boolean;
  existingContract: ContractData;
  buyers: StakeholderWithPersonnumber[];
  sellers: StakeholderWithPersonnumber[];
  lessees: StakeholderWithPersonnumber[];
  lessors: StakeholderWithPersonnumber[];
  updateStakeholders?: () => void;
  contractStatus?: Status;
  onUpdateLesseesOnly?: () => void;
  contractOveriewMode?: boolean;
}> = ({
  changeBadgeColor,
  onSave,
  readOnly = false,
  existingContract,
  buyers,
  sellers,
  lessees,
  lessors,
  updateStakeholders,
  contractStatus,
  onUpdateLesseesOnly,
  contractOveriewMode = false,
}) => {
  const { municipalityId, errand, user } = useAppContext();
  const { register, setValue, control, handleSubmit, getValues, watch, formState, trigger } =
    useFormContext<ContractData>();
  const [lesseeNoticeIndex, setLesseeNoticeIndex] = useState(0);
  const [lessorNoticeIndex, setLessorNoticeIndex] = useState(1);
  const [invoiceInfoIndex, setInvoiceInfoIndex] = useState(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [allowed, setAllowed] = useState(false);
  const [updatingParties, setUpdatingParties] = useState<boolean>(false);

  const contractType = watch().type;

  // Determine if contract is in DRAFT status (new contracts without status default to DRAFT behavior)
  const isDraft = !contractStatus || contractStatus === Status.DRAFT;

  // Determine if a field type is editable based on contract status
  // For non-DRAFT contracts, only billing and lessee fields can be edited
  const isEditable = (fieldType: 'general' | 'billing' | 'lessee') => {
    if (readOnly) return false;
    if (isDraft) return true;
    return fieldType === 'billing' || fieldType === 'lessee';
  };

  useEffect(() => {
    const _a = errand ? validateAction(errand, user) : false;
    setAllowed(_a);
  }, [user, errand]);

  useEffect(() => {
    lessees.forEach(async (s: StakeholderWithPersonnumber) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId ?? '');
      s.personalNumber = ssn;
      setValue('lessees', lessees);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessees]);

  const { replace: replaceLessees } = useFieldArray({
    control,
    keyName: 'lesseeId',
    name: 'lessees',
  });

  useEffect(() => {
    lessors.forEach(async (s: StakeholderWithPersonnumber) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId ?? '');
      s.personalNumber = ssn;
      setValue('lessors', lessors);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessors]);

  const { replace: replaceLessors } = useFieldArray({
    control,
    keyName: 'lessorId',
    name: 'lessors',
  });

  useEffect(() => {
    buyers.forEach(async (b: StakeholderWithPersonnumber, idx) => {
      const ssn = await getSSNFromPersonId(municipalityId, b.partyId ?? '');
      b.personalNumber = ssn;
      setValue('buyers', buyers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers]);

  const { replace: replaceBuyers } = useFieldArray({
    control,
    keyName: 'buyerId',
    name: 'buyers',
  });

  useEffect(() => {
    sellers.forEach(async (s: StakeholderWithPersonnumber, idx) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId ?? '');
      s.personalNumber = ssn;
      setValue('sellers', sellers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellers]);

  const { replace: replaceSellers } = useFieldArray({
    control,
    keyName: 'sellerId',
    name: 'sellers',
  });

  useEffect(() => {
    replaceLessees(lessees);
    replaceLessors(lessors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessees, lessors]);

  useEffect(() => {
    replaceSellers(sellers);
    replaceBuyers(buyers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyers, sellers]);

  const [errandPropertyDesignations, setErrandPropertyDesignations] = useState<{ name: string; district?: string }[]>(
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      if (errand) {
        const data = await getErrandPropertyInformation(errand);
        setErrandPropertyDesignations(data);
      }
    };
    fetchData();
  }, [errand]);

  useEffect(() => {
    if (existingContract) {
      if (isLeaseAgreement(existingContract.type)) {
        // Find index for lessee and lessor notices
        const lesseeIndex = existingContract.notice?.terms?.findIndex((n) => n.party === 'LESSEE') ?? -1;
        const lessorIndex = existingContract.notice?.terms?.findIndex((n) => n.party === 'LESSOR') ?? -1;
        setLesseeNoticeIndex(lesseeIndex === -1 ? 0 : lesseeIndex);
        setLessorNoticeIndex(lessorIndex === -1 ? 1 : lessorIndex);

        // Find index for InvoiceInfo extraparameter
        const _invoiceInfoIndex = existingContract.extraParameters?.findIndex((p) => p.name === 'InvoiceInfo') ?? -1;
        setInvoiceInfoIndex(
          _invoiceInfoIndex === -1 ? (existingContract.extraParameters ?? []).length : _invoiceInfoIndex
        );
      }
    }
  }, [existingContract]);

  const toPropertyDesignation = (pd: { name?: string } | string): string =>
    typeof pd === 'object' && pd.name ? pd.name : typeof pd === 'string' ? pd : '';

  const saveButton = () => {
    if (readOnly) return null;
    return (
      <div className="my-md">
        {loading ? (
          <Button disabled={true}>Sparar</Button>
        ) : (
          <div>
            <Button
              data-cy="save-contract-button"
              disabled={!allowed}
              onClick={handleSubmit(
                () => {
                  setLoading(true);
                  onSave?.({ ...getValues() }).then(() => {
                    setLoading(false);
                  });
                },
                (e) => {
                  console.error('Something went wrong when saving:', e);
                }
              )}
            >
              Spara
            </Button>
          </div>
        )}
      </div>
    );
  };

  const partyTable = (
    label: 'Säljare' | 'Köpare' | 'Upplåtare' | 'Arrendatorer',
    stakeholders: StakeholderWithPersonnumber[]
  ) => (
    <Table dense background data-cy={`${label}-table`}>
      <Table.Header>
        <Table.HeaderColumn>{label}</Table.HeaderColumn>
        <Table.HeaderColumn>Adress</Table.HeaderColumn>
        <Table.HeaderColumn>Roll</Table.HeaderColumn>
      </Table.Header>
      <Table.Body>
        {stakeholders?.length > 0 ? (
          stakeholders.map((b, idx) => (
            <Table.Row key={`row-${idx}`} data-cy={`${label}-row-${idx}`}>
              <Table.Column className="flex flex-col items-start justify-center !gap-0" data-cy={`party-${idx}-name`}>
                <div>
                  <strong>{getContractStakeholderName(b)}</strong>
                </div>
                <div>
                  {b.type === 'ASSOCIATION' || b.type === 'MUNICIPALITY' || b.type === 'ORGANIZATION'
                    ? b.organizationNumber
                    : b.personalNumber}
                </div>
              </Table.Column>
              <Table.Column
                className="flex flex-col items-start justify-center !gap-0"
                data-cy={`party-${idx}-address`}
              >
                {b.address?.streetAddress && b.address?.postalCode && b.address?.town ? (
                  <>
                    <div>
                      <strong>{b?.address?.streetAddress}</strong>
                    </div>
                    <div>{b?.address?.careOf}</div>
                    <div>
                      {b?.address?.postalCode} {b?.address?.town}
                    </div>
                  </>
                ) : (
                  <strong>(saknas)</strong>
                )}
              </Table.Column>
              <Table.Column className="flex flex-col items-start justify-center !gap-0" data-cy={`party-${idx}-role`}>
                {(b.roles?.length ?? 0) > 0 ? (
                  (b.roles ?? [])
                    .filter((r) => r !== StakeholderRole.CONTACT_PERSON)
                    .map((role, idx) => <div key={`role-${idx}`}>{prettyContractRoles[role]}</div>)
                ) : (
                  <strong>(saknas)</strong>
                )}
              </Table.Column>
            </Table.Row>
          ))
        ) : (
          <Table.Row>
            <Table.Column className="flex flex-col items-start justify-center !gap-0">
              <div>
                <strong>(saknas)</strong>
              </div>
            </Table.Column>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );

  return (
    <>
      {!isDraft && !readOnly && (
        <div
          data-cy="non-draft-warning-banner"
          className="flex h-auto w-full gap-12 rounded-[1.6rem] bg-warning-background-100 p-12 mb-[2.5rem] border-1 border-warning-surface-primary"
        >
          <Info className="text-primary w-20 h-20 shrink-0" />
          <span className="text-primary text-md leading-[1.8rem] font-normal font-sans break-words flex-1 min-w-0">
            <p className="mt-0">
              Avtalet är inte längre ett utkast. Endast fakturareferens och fakturamottagare kan ändras.
            </p>
          </span>
        </div>
      )}
      <Disclosure
        data-cy="parties-disclosure"
        initalOpen
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor?.(`badge-parties`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<Users />} />
          <Disclosure.Title>Parter</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <div className="flex flex-col gap-24">
            {getValues().type === ContractType.PURCHASE_AGREEMENT ? (
              <>
                {partyTable('Säljare', sellers)}
                {partyTable('Köpare', buyers)}
              </>
            ) : isLeaseAgreement(getValues().type) ? (
              <>
                {partyTable('Upplåtare', lessors)}
                {partyTable('Arrendatorer', lessees)}
              </>
            ) : null}
            {!readOnly && updateStakeholders && onSave && (
              <div>
                <Button
                  size="sm"
                  data-cy="update-contract-parties"
                  rightIcon={<RefreshCcw />}
                  variant="secondary"
                  loading={updatingParties}
                  loadingText="Uppdaterar"
                  onClick={() => {
                    setUpdatingParties(true);
                    if (isDraft) {
                      updateStakeholders();
                    } else {
                      onUpdateLesseesOnly?.();
                    }
                    setTimeout(
                      handleSubmit(
                        async () => {
                          await onSave(getValues()).catch(() => {
                            setUpdatingParties(false);
                          });
                          setUpdatingParties(false);
                        },
                        (e) => {
                          console.error('Error validating form after updating parties:', e);
                          setUpdatingParties(false);
                        }
                      ),
                      0
                    );
                  }}
                >
                  {isDraft ? 'Uppdatera parter' : 'Uppdatera fakturamottagare'}
                </Button>
              </div>
            )}
            <div className="flex gap-18 justify-start">
              <FormControl id="oldContractId" className="w-full">
                <FormLabel>Avtals-ID</FormLabel>
                <Input
                  type="text"
                  data-cy="old-contract-id-input"
                  readOnly={!isEditable('general')}
                  {...register('externalReferenceId')}
                />
                <small>Om det finns ett äldre avtal, ange dess ID ovan.</small>
              </FormControl>
            </div>
            {saveButton()}
          </div>
        </Disclosure.Content>
      </Disclosure>
      <Disclosure
        data-cy="area-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor?.(`badge-area`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<MapPin />} />
          <Disclosure.Title>Område</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <div className="flex flex-col gap-24">
            <div className="flex gap-18 justify-start">
              <FormControl>
                <FormLabel>
                  Ange vilka fastighet/er som området ligger på{' '}
                  <span className="font-normal">(hämtad från uppgifter)</span>
                </FormLabel>
                {(errand?.facilities?.length ?? 0) > 0 || (existingContract?.propertyDesignations?.length ?? 0) > 0 ? (
                  <Checkbox.Group
                    data-cy="contract-property-designation-checkboxgroup"
                    name="propertyDesignations"
                    value={(watch().propertyDesignations ?? []).map((pd) => pd.name)}
                    onChange={(e) => {
                      if (!isEditable('general')) return;
                      const totalPropertyDesignations = [
                        ...(errandPropertyDesignations ?? []),
                        ...(existingContract?.propertyDesignations || []),
                      ];
                      const selected = e
                        .map((pdName) => totalPropertyDesignations.find((epd) => epd.name === pdName))
                        .filter((pd): pd is { name: string; district?: string } => !!pd);
                      setValue('propertyDesignations', selected);
                    }}
                  >
                    {(() => {
                      const combined = [
                        ...(errandPropertyDesignations ?? []),
                        ...(existingContract?.propertyDesignations || []),
                      ];
                      const uniqueByName = combined.reduce((acc, pd) => {
                        const name = toPropertyDesignation(pd);
                        if (!acc.has(name)) {
                          acc.set(name, pd);
                        }
                        return acc;
                      }, new Map<string, { name?: string; district?: string }>());
                      return Array.from(uniqueByName.entries()).map(([name, pd], idx) => (
                        <Checkbox
                          data-cy={`property-designation-checkbox-${name.replace(/\s+/g, '-')}`}
                          key={`facility-${idx}`}
                          value={name}
                          disabled={!isEditable('general')}
                        >
                          {pd.district ? `${name} (${pd.district})` : name}
                        </Checkbox>
                      ));
                    })()}
                  </Checkbox.Group>
                ) : (
                  <span>Inga fastighetsbeteckningar finns angivna på ärendet</span>
                )}
              </FormControl>
            </div>
            {saveButton()}
          </div>
        </Disclosure.Content>
      </Disclosure>
      {getValues().type === ContractType.PURCHASE_AGREEMENT ? (
        <Disclosure
          data-cy="startdatum-disclosure"
          color="gronsta"
          variant="alt"
          onClick={() => {
            changeBadgeColor?.(`badge-startdatum`);
          }}
        >
          <Disclosure.Header>
            <Disclosure.Icon icon={<Wallet />} />
            <Disclosure.Title>Avtalsstartdatum</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div className="flex flex-col gap-24">
              <div className="flex gap-18 justify-start">
                <FormControl id="startDate" className="w-full">
                  <FormLabel>Avtalets startdatum</FormLabel>
                  <Input
                    type="date"
                    readOnly={!isEditable('general')}
                    {...register('startDate')}
                    data-cy="avtalstid-start"
                  />
                </FormControl>
              </div>
              {saveButton()}
            </div>
          </Disclosure.Content>
        </Disclosure>
      ) : (
        <Disclosure
          data-cy="avtalstid-disclosure"
          color="gronsta"
          variant="alt"
          initalOpen={(formState.errors.notice?.terms?.length ?? 0) > 0}
          onClick={() => {
            changeBadgeColor?.(`badge-avtalstid`);
          }}
        >
          <Disclosure.Header>
            <Disclosure.Icon icon={<Calendar />} />
            <Disclosure.Title>Avtalstid och uppsägning</Disclosure.Title>
            {(formState.errors.notice?.terms?.length ?? 0) > 0 ||
              (formState.errors.extension?.leaseExtension && (
                <Label className="w-[15rem]" rounded inverted color={'error'}>
                  Fel i formulär
                </Label>
              ))}
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div className="flex flex-col gap-24">
              <div className="flex gap-18 justify-start">
                <FormControl id="startDate" className="w-full">
                  <FormLabel>Området upplåts från</FormLabel>
                  <Input
                    type="date"
                    readOnly={!isEditable('general')}
                    {...register('startDate')}
                    data-cy="avtalstid-start"
                  />
                </FormControl>
                <FormControl id="endDate" className="w-full">
                  <FormLabel>Området upplåts till</FormLabel>
                  <Input
                    type="date"
                    readOnly={!isEditable('general')}
                    {...register('endDate')}
                    data-cy="avtalstid-end"
                  />
                </FormControl>
              </div>
              <strong>Ange tid för nyttjanderättshavarens uppsägningstid</strong>
              <div className="flex justify-between gap-32 items-start mb-md">
                <FormControl id={`noticePeriod-0`} className="flex-grow max-w-[45%]">
                  <FormLabel>Enhet</FormLabel>
                  <Select
                    className="w-full"
                    disabled={!isEditable('general')}
                    {...register(`notice.terms.${lesseeNoticeIndex}.unit`)}
                    placeholder="Månad/år"
                    data-cy="lessee-notice-unit"
                  >
                    <Select.Option value={TimeUnit.DAYS}>Dagar</Select.Option>
                    <Select.Option value={TimeUnit.MONTHS}>Månader</Select.Option>
                    <Select.Option value={TimeUnit.YEARS}>År</Select.Option>
                  </Select>
                </FormControl>
                <FormControl className="flex-grow max-w-[45%]">
                  <FormLabel>Antal</FormLabel>
                  <Input
                    readOnly={!isEditable('general')}
                    {...register(`notice.terms.${lesseeNoticeIndex}.periodOfNotice`)}
                    placeholder="Ange tal"
                    data-cy="lessee-notice-period"
                  />
                  <Input
                    type="hidden"
                    readOnly
                    {...register(`notice.terms.${lesseeNoticeIndex}.party`)}
                    value="LESSEE"
                    data-cy="lessee-notice-party"
                  />
                  {formState.errors.notice?.terms?.[lesseeNoticeIndex]?.periodOfNotice && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>
                        {formState.errors.notice?.terms?.[lesseeNoticeIndex]?.periodOfNotice?.message}
                      </FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              </div>

              <strong className="text-h6-md">Ange tid för fastighetsägarens uppsägningstid</strong>
              <div className="flex justify-between gap-32 items-start mb-md">
                <FormControl id={`noticePeriod-1`} className="flex-grow max-w-[45%]">
                  <FormLabel>Enhet</FormLabel>
                  <Select
                    className="w-full"
                    disabled={!isEditable('general')}
                    {...register(`notice.terms.${lessorNoticeIndex}.unit`)}
                    placeholder="Månad/år"
                    data-cy="lessor-notice-unit"
                  >
                    <Select.Option value={TimeUnit.DAYS}>Dagar</Select.Option>
                    <Select.Option value={TimeUnit.MONTHS}>Månader</Select.Option>
                    <Select.Option value={TimeUnit.YEARS}>År</Select.Option>
                  </Select>
                </FormControl>
                <FormControl className="flex-grow max-w-[45%]">
                  <FormLabel>Antal</FormLabel>
                  <Input
                    readOnly={!isEditable('general')}
                    {...register(`notice.terms.${lessorNoticeIndex}.periodOfNotice`)}
                    placeholder="Ange tal"
                    data-cy="lessor-notice-period"
                  />
                  <Input
                    type="hidden"
                    readOnly
                    {...register(`notice.terms.${lessorNoticeIndex}.party`)}
                    value="LESSOR"
                    data-cy="lessor-notice-party"
                  />
                  {formState.errors.notice?.terms?.[lessorNoticeIndex]?.periodOfNotice && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>
                        {formState.errors.notice?.terms?.[lessorNoticeIndex]?.periodOfNotice?.message}
                      </FormErrorMessage>
                    </div>
                  )}
                </FormControl>
              </div>

              <div className="flex justify-between gap-32 items-end mb-md">
                <FormControl
                  className="flex-grow"
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    if (!isEditable('general')) return;
                    setValue('extension.autoExtend', e.target.value === 'true');
                    trigger();
                  }}
                >
                  <FormLabel>Automatisk förlängning av avtalet</FormLabel>
                  <RadioButton.Group className="flex gap-24" value={watch().extension?.autoExtend ? 'true' : 'false'}>
                    <RadioButton data-cy="autoextend-true-radiobutton" value={'true'} disabled={!isEditable('general')}>
                      Ja
                    </RadioButton>
                    <RadioButton value={'false'} disabled={!isEditable('general')}>
                      Nej
                    </RadioButton>
                  </RadioButton.Group>
                </FormControl>
              </div>

              {watch().extension?.autoExtend && (
                <div className="flex justify-between gap-32 items-start mb-md">
                  <FormControl id={`extension`} className="flex-grow max-w-[45%]">
                    <FormLabel>Enhet</FormLabel>
                    <Select
                      className="w-full"
                      disabled={!isEditable('general')}
                      {...register('extension.unit')}
                      placeholder="Månad/år"
                      data-cy="extension-unit-selector"
                    >
                      <Select.Option value={TimeUnit.DAYS}>Dagar</Select.Option>
                      <Select.Option value={TimeUnit.MONTHS}>Månader</Select.Option>
                      <Select.Option value={TimeUnit.YEARS}>År</Select.Option>
                    </Select>
                  </FormControl>
                  <FormControl className="flex-grow max-w-[45%]">
                    <FormLabel>Antal</FormLabel>
                    <Input
                      readOnly={!isEditable('general')}
                      {...register('extension.leaseExtension')}
                      placeholder="Ange tal"
                      data-cy="extension-input"
                    />
                    {formState.errors.extension?.leaseExtension && (
                      <div className="my-sm text-error">
                        <FormErrorMessage>{formState.errors.extension?.leaseExtension?.message}</FormErrorMessage>
                      </div>
                    )}
                  </FormControl>
                </div>
              )}
              {saveButton()}
            </div>
          </Disclosure.Content>
        </Disclosure>
      )}
      {hasRecurringFee(contractType, watch().leaseType) && (
        <Disclosure
          data-cy="lopande-disclosure"
          color="gronsta"
          variant="alt"
          onClick={() => {
            changeBadgeColor?.(`badge-lopande`);
          }}
        >
          <Disclosure.Header>
            <Disclosure.Icon icon={<Wallet />} />
            <Disclosure.Title>Löpande avgift</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div className="flex flex-col gap-24">
              <div className="flex gap-18 justify-start">
                <FormControl className="flex-grow" {...register('generateInvoice')}>
                  <FormLabel>Ska detta avtal generera en faktura?</FormLabel>
                  <RadioButton.Group inline className="flex gap-24" name="generateInvoice">
                    <RadioButton
                      value="true"
                      data-cy="generate-invoice-true-radiobutton"
                      disabled={!isEditable('general')}
                    >
                      Ja
                    </RadioButton>
                    <RadioButton
                      value="false"
                      data-cy="generate-invoice-false-radiobutton"
                      disabled={!isEditable('general')}
                    >
                      Nej
                    </RadioButton>
                  </RadioButton.Group>
                </FormControl>
              </div>
              {getValues().generateInvoice === 'true' ? (
                <>
                  <div className="flex gap-18 justify-start">
                    <FormControl>
                      <FormLabel>Ange avgift/år</FormLabel>
                      <Input
                        type="number"
                        readOnly={!isEditable('general')}
                        {...register('fees.yearly')}
                        data-cy="fees-yearly-input"
                      />
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl
                      className="flex-grow"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        if (!isEditable('general')) return;
                        setValue('indexAdjusted', e.target.value as 'true' | 'false');
                      }}
                    >
                      <FormLabel>Ska detta avtal indexregleras?</FormLabel>
                      <RadioButton.Group
                        inline
                        className="flex gap-24"
                        name="indexAdjusted"
                        value={getValues().indexAdjusted}
                      >
                        <RadioButton value="true" data-cy="indexed-true-radiobutton" disabled={!isEditable('general')}>
                          Ja
                        </RadioButton>
                        <RadioButton
                          value="false"
                          data-cy="indexed-false-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Nej
                        </RadioButton>
                      </RadioButton.Group>
                      {!contractOveriewMode && <small>Indexreglering baseras på nuvarande år (Oktober månad)</small>}
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl
                      className="flex-grow"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        if (!isEditable('general')) return;
                        setValue('invoicing.invoiceInterval', e.target.value as IntervalType);
                      }}
                    >
                      <FormLabel>Avgift ska betalas</FormLabel>
                      <RadioButton.Group
                        inline
                        className="flex gap-24"
                        name="invoiceInterval"
                        value={
                          watch().invoicing?.invoiceInterval === IntervalType.YEARLY
                            ? IntervalType.YEARLY
                            : watch().invoicing?.invoiceInterval === IntervalType.HALF_YEARLY
                            ? IntervalType.HALF_YEARLY
                            : watch().invoicing?.invoiceInterval === IntervalType.QUARTERLY
                            ? IntervalType.QUARTERLY
                            : IntervalType.MONTHLY
                        }
                      >
                        <RadioButton
                          value={IntervalType.YEARLY}
                          data-cy="invoice-interval-yearly-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Årsvis
                        </RadioButton>
                        <RadioButton
                          value={IntervalType.HALF_YEARLY}
                          data-cy="invoice-interval-halfyearly-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Halvårsvis
                        </RadioButton>
                        <RadioButton
                          value={IntervalType.QUARTERLY}
                          data-cy="invoice-interval-quarterly-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Kvartalsvis
                        </RadioButton>
                      </RadioButton.Group>
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl>
                      <FormLabel>Ange fakturans referensnummer</FormLabel>
                      <Input
                        type="text"
                        readOnly={!isEditable('billing')}
                        {...register(`extraParameters.${invoiceInfoIndex}.parameters.markup`)}
                        data-cy="invoice-markup-input"
                      />
                      <small>Om fakturamottagaren är ett företag måste referens anges.</small>
                      <Input
                        type="hidden"
                        {...register(`extraParameters.${invoiceInfoIndex}.name`)}
                        value={getValues().extraParameters?.[invoiceInfoIndex]?.name ?? 'InvoiceInfo'}
                      />
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl className="flex-grow">
                      <FormLabel>Avitext</FormLabel>
                      <Textarea
                        rows={3}
                        className="w-full"
                        readOnly
                        {...register('fees.additionalInformation.0')}
                        data-cy="fees-additional-information-0-input"
                      ></Textarea>
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl className="flex-grow">
                      <FormLabel>Kompletterande avitext</FormLabel>
                      <Textarea
                        maxLength={50}
                        maxLengthWarningText="Maxlängd 50 tecken"
                        rows={3}
                        className="w-full"
                        readOnly={!isEditable('billing')}
                        {...register('fees.additionalInformation.1')}
                        data-cy="fees-additional-information-1-input"
                      ></Textarea>
                    </FormControl>
                  </div>
                </>
              ) : null}
              {saveButton()}
            </div>
          </Disclosure.Content>
        </Disclosure>
      )}
      <Disclosure
        data-cy="fakturor-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor?.(`badge-fakturor`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<Receipt />} />
          <Disclosure.Title>Fakturor</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <ContractInvoicesTable contractId={existingContract?.contractId} municipalityId={municipalityId} />
        </Disclosure.Content>
      </Disclosure>
      <Disclosure
        data-cy="bilagor-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor?.(`badge-bilagor`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<FilePen />} />
          <Disclosure.Title>Avtalsbilagor</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <ContractAttachments existingContract={existingContract} readOnly={!isEditable('general')} />
        </Disclosure.Content>
      </Disclosure>
    </>
  );
};

export default ContractForm;
