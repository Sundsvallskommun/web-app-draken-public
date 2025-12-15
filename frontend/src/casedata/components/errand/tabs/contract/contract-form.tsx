import { ContractData, StakeholderWithPersonnumber } from '@casedata/interfaces/contract-data';
import { ContractType, IntervalType, StakeholderRole, TimeUnit } from '@casedata/interfaces/contracts';
import { IErrand } from '@casedata/interfaces/errand';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { getErrandPropertyDesignations } from '@casedata/services/casedata-facilities-service';
import { getSSNFromPersonId } from '@casedata/services/casedata-stakeholder-service';
import { getContractStakeholderName, prettyContractRoles } from '@casedata/services/contract-service';
import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import {
  Button,
  Checkbox,
  Disclosure,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Label,
  RadioButton,
  Select,
  Table,
  Textarea,
} from '@sk-web-gui/react';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ContractAttachments } from './contract-attachments';

export const ContractForm: React.FC<{
  changeBadgeColor;
  onSave;
  existingContract: ContractData;
  buyers: StakeholderWithPersonnumber[];
  sellers: StakeholderWithPersonnumber[];
  lessees: StakeholderWithPersonnumber[];
  lessors: StakeholderWithPersonnumber[];
  updateStakeholders: () => void;
}> = ({ changeBadgeColor, onSave, existingContract, buyers, sellers, lessees, lessors, updateStakeholders }) => {
  const {
    municipalityId,
    errand,
    user,
  }: { municipalityId: string; errand: IErrand; user: User; setErrand: Dispatch<SetStateAction<IErrand>> } =
    useAppContext();
  const { register, setValue, control, handleSubmit, getValues, watch, formState, trigger } =
    useFormContext<ContractData>();
  const [lesseeNoticeIndex, setLesseeNoticeIndex] = useState(0);
  const [lessorNoticeIndex, setLessorNoticeIndex] = useState(1);
  const [invoiceInfoIndex, setInvoiceInfoIndex] = useState(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [allowed, setAllowed] = useState(false);
  const [updatingParties, setUpdatingParties] = useState<boolean>(false);

  useEffect(() => {
    const _a = validateAction(errand, user);
    setAllowed(_a);
  }, [user, errand]);

  useEffect(() => {
    lessees.forEach(async (s: StakeholderWithPersonnumber) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId);
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
    lessors.forEach(async (s: StakeholderWithPersonnumber, idx) => {
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId);
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
      const ssn = await getSSNFromPersonId(municipalityId, b.partyId);
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
      const ssn = await getSSNFromPersonId(municipalityId, s.partyId);
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

  useEffect(() => {
    if (existingContract) {
      if (existingContract.type === ContractType.LEASE_AGREEMENT) {
        // Find index for lessee and lessor notices
        const lesseeIndex = existingContract.notices?.findIndex((n) => n.party === 'LESSEE');
        const lessorIndex = existingContract.notices?.findIndex((n) => n.party === 'LESSOR');
        setLesseeNoticeIndex(lesseeIndex === -1 ? 0 : lesseeIndex);
        setLessorNoticeIndex(lessorIndex === -1 ? 1 : lessorIndex);

        // Find index for InvoiceInfo extraparameter
        const _invoiceInfoIndex = existingContract.extraParameters?.findIndex((p) => p.name === 'InvoiceInfo');
        setInvoiceInfoIndex(_invoiceInfoIndex === -1 ? existingContract.extraParameters.length : _invoiceInfoIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingContract]);

  const saveButton = () => {
    return (
      <div className="my-md">
        {loading ? (
          <Button disabled={true}>Sparar</Button>
        ) : (
          <div>
            <Button
              disabled={!allowed}
              onClick={handleSubmit(
                () => {
                  setLoading(true);
                  onSave({ ...getValues() }).then(() => {
                    setLoading(undefined);
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
            <Table.Row key={`row-${idx}`}>
              <Table.Column className="flex flex-col items-start justify-center !gap-0">
                <div>
                  <strong>{getContractStakeholderName(b)}</strong>
                </div>
                <div>
                  {b.type === 'COMPANY' || b.type === 'ASSOCIATION' || b.type === 'MUNICIPALITY'
                    ? b.organizationNumber
                    : b.personalNumber}
                </div>
              </Table.Column>
              <Table.Column className="flex flex-col items-start justify-center !gap-0">
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
              <Table.Column className="flex flex-col items-start justify-center !gap-0">
                {b.roles?.length > 0 ? (
                  b.roles
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
      <Disclosure
        data-cy="parties-disclosure"
        initalOpen
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-parties`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="users" />} />
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
            ) : getValues().type === ContractType.LEASE_AGREEMENT ? (
              <>
                {partyTable('Upplåtare', lessors)}
                {partyTable('Arrendatorer', lessees)}
              </>
            ) : null}
            <div>
              <Button
                size="sm"
                rightIcon={<LucideIcon name="refresh-ccw" />}
                variant="secondary"
                loading={updatingParties}
                loadingText="Uppdaterar"
                onClick={() => {
                  setUpdatingParties(true);
                  updateStakeholders();
                  setTimeout(async () => {
                    await onSave(getValues()).catch(() => {
                      setUpdatingParties(false);
                    });
                    setUpdatingParties(false);
                  }, 0);
                }}
              >
                Uppdatera parter
              </Button>
            </div>
            <div className="flex gap-18 justify-start">
              <FormControl id="oldContractId" className="w-full">
                <FormLabel>Tidigare avtals-ID</FormLabel>
                <Input type="text" data-cy="old-contract-id-input" {...register('externalReferenceId')} />
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
          changeBadgeColor(`badge-area`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="map-pin" />} />
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
                {errand.facilities?.length > 0 ? (
                  <Checkbox.Group
                    data-cy="property-designation-checkboxgroup"
                    name="propertyDesignations"
                    defaultValue={getValues().propertyDesignations}
                  >
                    {[
                      ...new Set([
                        ...getErrandPropertyDesignations(errand),
                        ...(existingContract?.propertyDesignations || []),
                      ]),
                    ].map((p, idx) => (
                      <Checkbox
                        {...register('propertyDesignations')}
                        data-cy={`property-designation-checkbox-${p.replace(/\s+/g, '-')}`}
                        key={`facility-${idx}`}
                        value={p}
                      >
                        {p}
                      </Checkbox>
                    ))}
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
      <Disclosure
        data-cy="avtalstid-disclosure"
        color="gronsta"
        variant="alt"
        initalOpen={formState.errors.notices?.length > 0}
        onClick={() => {
          changeBadgeColor(`badge-avtalstid`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="calendar" />} />
          <Disclosure.Title>Avtalstid och uppsägning</Disclosure.Title>
          {formState.errors.notices?.length > 0 ||
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
                <Input type="date" {...register('start')} data-cy="avtalstid-start" />
              </FormControl>
              <FormControl id="endDate" className="w-full">
                <FormLabel>Området upplåts till</FormLabel>
                <Input type="date" {...register('end')} data-cy="avtalstid-end" />
              </FormControl>
            </div>
            <strong>Ange tid för nyttjanderättshavarens uppsägningstid</strong>
            <div className="flex justify-between gap-32 items-start mb-md">
              <FormControl id={`noticePeriod-0`} className="flex-grow max-w-[45%]">
                <FormLabel>Enhet</FormLabel>
                <Select
                  className="w-full"
                  {...register(`notices.${lesseeNoticeIndex}.unit`)}
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
                  {...register(`notices.${lesseeNoticeIndex}.periodOfNotice`)}
                  placeholder="Ange tal"
                  data-cy="lessee-notice-period"
                />
                <Input
                  type="hidden"
                  readOnly
                  {...register(`notices.${lesseeNoticeIndex}.party`)}
                  value="LESSEE"
                  data-cy="lessee-notice-party"
                />
                {formState.errors.notices?.[lesseeNoticeIndex]?.periodOfNotice && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>
                      {formState.errors.notices?.[lesseeNoticeIndex]?.periodOfNotice?.message}
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
                  {...register(`notices.${lessorNoticeIndex}.unit`)}
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
                  {...register(`notices.${lessorNoticeIndex}.periodOfNotice`)}
                  placeholder="Ange tal"
                  data-cy="lessor-notice-period"
                />
                <Input
                  type="hidden"
                  readOnly
                  {...register(`notices.${lessorNoticeIndex}.party`)}
                  value="LESSOR"
                  data-cy="lessor-notice-party"
                />
                {formState.errors.notices?.[lessorNoticeIndex]?.periodOfNotice && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>
                      {formState.errors.notices?.[lessorNoticeIndex]?.periodOfNotice?.message}
                    </FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>

            <div className="flex justify-between gap-32 items-end mb-md">
              <FormControl
                className="flex-grow"
                onChange={(e) => {
                  setValue('extension.autoExtend', e.target.value === 'true');
                  trigger();
                }}
              >
                <FormLabel>Automatisk förlängning av avtalet</FormLabel>
                <RadioButton.Group className="flex gap-24" value={watch().extension?.autoExtend ? 'true' : 'false'}>
                  <RadioButton data-cy="autoextend-true-radiobutton" value={'true'}>
                    Ja
                  </RadioButton>
                  <RadioButton value={'false'}>Nej</RadioButton>
                </RadioButton.Group>
              </FormControl>
            </div>

            <div className="flex justify-between gap-32 items-start mb-md">
              <FormControl id={`extension`} className="flex-grow max-w-[45%]">
                <FormLabel>Enhet</FormLabel>
                <Select
                  className="w-full"
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
                <Input {...register('extension.leaseExtension')} placeholder="Ange tal" data-cy="extension-input" />
                {formState.errors.extension?.leaseExtension && (
                  <div className="my-sm text-error">
                    <FormErrorMessage>{formState.errors.extension?.leaseExtension?.message}</FormErrorMessage>
                  </div>
                )}
              </FormControl>
            </div>
            {saveButton()}
          </div>
        </Disclosure.Content>
      </Disclosure>
      <Disclosure
        data-cy="lopande-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-lopande`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="wallet" />} />
          <Disclosure.Title>Löpande avgift</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <div className="flex flex-col gap-24">
            <div className="flex gap-18 justify-start">
              <FormControl className="flex-grow" {...register('generateInvoice')}>
                <FormLabel>Ska detta avtal generera en faktura?</FormLabel>
                <RadioButton.Group inline className="flex gap-24" name="generateInvoice">
                  <RadioButton value="true" data-cy="generate-invoice-true-radiobutton">
                    Ja
                  </RadioButton>
                  <RadioButton value="false" data-cy="generate-invoice-false-radiobutton">
                    Nej
                  </RadioButton>
                </RadioButton.Group>
              </FormControl>
            </div>
            <div className="flex gap-18 justify-start">
              <FormControl>
                <FormLabel>Ange avgift/år</FormLabel>
                <Input type="number" {...register('fees.yearly')} data-cy="fees-yearly-input" />
              </FormControl>
            </div>
            <div className="flex gap-18 justify-start">
              <FormControl
                className="flex-grow"
                onChange={(e) => {
                  setValue('indexAdjusted', e.target.value);
                }}
              >
                <FormLabel>Ska detta avtal indexregleras?</FormLabel>
                <RadioButton.Group
                  inline
                  className="flex gap-24"
                  name="indexAdjusted"
                  value={getValues().indexAdjusted}
                >
                  <RadioButton value="true" data-cy="indexed-true-radiobutton">
                    Ja
                  </RadioButton>
                  <RadioButton value="false" data-cy="indexed-false-radiobutton">
                    Nej
                  </RadioButton>
                </RadioButton.Group>
                <small>Indexreglering baseras på nuvarande år (Oktober månad)</small>
              </FormControl>
            </div>
            <div className="flex gap-18 justify-start">
              <FormControl
                className="flex-grow"
                onChange={(e) => {
                  setValue('invoicing.invoiceInterval', e.target.value);
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
                  <RadioButton value={IntervalType.YEARLY} data-cy="invoice-interval-yearly-radiobutton">
                    Årsvis
                  </RadioButton>
                  <RadioButton value={IntervalType.HALF_YEARLY} data-cy="invoice-interval-halfyearly-radiobutton">
                    Halvårsvis
                  </RadioButton>
                  <RadioButton value={IntervalType.QUARTERLY} data-cy="invoice-interval-quarterly-radiobutton">
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
                  {...register(`extraParameters.${invoiceInfoIndex}.parameters.markup`)}
                  data-cy="invoice-markup-input"
                />
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
                  {...register('fees.additionalInformation.1')}
                  data-cy="fees-additional-information-1-input"
                ></Textarea>
              </FormControl>
            </div>

            {saveButton()}
          </div>
        </Disclosure.Content>
      </Disclosure>
      <Disclosure
        data-cy="engangs-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-engangs`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="wallet" />} />
          <Disclosure.Title>Engångsfakturering</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <div className="flex flex-col gap-24">Engångsfakturering</div>
        </Disclosure.Content>
      </Disclosure>
      <Disclosure
        data-cy="signerade-disclosure"
        color="gronsta"
        variant="alt"
        onClick={() => {
          changeBadgeColor(`badge-signerade`);
        }}
      >
        <Disclosure.Header>
          <Disclosure.Icon icon={<LucideIcon name="file-pen" />} />
          <Disclosure.Title>Signerade avtal</Disclosure.Title>
          <Disclosure.Button />
        </Disclosure.Header>
        <Disclosure.Content>
          <ContractAttachments existingContract={existingContract} />
        </Disclosure.Content>
      </Disclosure>
    </>
  );
};

export default ContractForm;
