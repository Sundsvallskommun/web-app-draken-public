import { ContractInvoicesTable } from '@casedata/components/contract-overview/contract-invoices-table.component';
import { MEXCaseType } from '@casedata/interfaces/case-type';
import { ContractData, UnifiedContractParty } from '@casedata/interfaces/contract-data';
import {
  ContractType,
  IntervalType,
  InvoicedIn,
  Party,
  StakeholderRole,
  Status,
  TimeUnit,
} from '@casedata/interfaces/contracts';
import { CasedataOwnerOrContact } from '@casedata/interfaces/stakeholder';
import { validateAction } from '@casedata/services/casedata-errand-service';
import { getSSNFromPersonId } from '@casedata/services/casedata-stakeholder-service';
import {
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
  useConfirm,
} from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Calendar, FilePen, Info, MapPin, Pencil, Receipt, Trash, Users, Wallet } from 'lucide-react';
import { ChangeEvent, FC, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { ContractAttachments } from './contract-attachments';
import { ContractPartyModal } from './contract-party-modal';

export const ContractForm: FC<{
  referensError: boolean;
  changeBadgeColor?: (badgeId: string) => void;
  onSave?: (data: ContractData, section?: string) => Promise<void>;
  readOnly?: boolean;
  existingContract: ContractData;
  contractParties: UnifiedContractParty[];
  contractStatus?: Status;
  contractOveriewMode?: boolean;
  errandStakeholders?: CasedataOwnerOrContact[];
  onAddParty?: (stakeholderId: string, roles: StakeholderRole[]) => void;
  onEditPartyRoles?: (stakeholderId: string, newRoles: StakeholderRole[]) => void;
  onRemoveParty?: (stakeholderId: string) => void;
}> = ({
  referensError,
  changeBadgeColor,
  onSave,
  readOnly = false,
  existingContract,
  contractParties,
  contractStatus,
  contractOveriewMode = false,
  errandStakeholders,
  onAddParty,
  onEditPartyRoles,
  onRemoveParty,
}) => {
  const { municipalityId, errand, user } = useAppContext();
  const confirm = useConfirm();
  const { register, setValue, handleSubmit, getValues, watch, formState, trigger } = useFormContext<ContractData>();

  const [loading, setLoading] = useState<boolean>(false);

  const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
  const [partyModalMode, setPartyModalMode] = useState<'add' | 'edit'>('add');
  const [editingParty, setEditingParty] = useState<UnifiedContractParty | undefined>(undefined);

  const contractType = watch().type;

  const isDraft = !contractStatus || contractStatus === Status.DRAFT;

  // For non-DRAFT contracts, only billing, lessee, and cancellation fields can be edited
  const isEditable = (fieldType: 'general' | 'billing' | 'lessee' | 'cancellation') => {
    if (readOnly) return false;
    if (isDraft) return true;
    return fieldType === 'billing' || fieldType === 'lessee' || fieldType === 'cancellation';
  };

  const allowed = useMemo(() => {
    if (!errand) return false;
    return validateAction(errand, user);
  }, [errand, user]);

  const [ssnMap, setSsnMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchSSNs = async () => {
      const entries = await Promise.all(
        contractParties
          .filter((p) => p.type === 'PERSON' && p.originalStakeholder.partyId && !p.personalNumber)
          .map(async (p) => {
            const ssn = await getSSNFromPersonId(municipalityId, p.originalStakeholder.partyId!);
            return [p.originalStakeholder.partyId!, ssn] as const;
          })
      );
      if (!cancelled) setSsnMap(Object.fromEntries(entries));
    };

    fetchSSNs();

    return () => {
      cancelled = true;
    };
  }, [contractParties, municipalityId]);

  const partiesWithSSN = useMemo(
    () =>
      contractParties.map((party) =>
        party.type === 'PERSON' && party.originalStakeholder.partyId && !party.personalNumber
          ? { ...party, personalNumber: ssnMap[party.originalStakeholder.partyId] ?? party.personalNumber }
          : party
      ),
    [contractParties, ssnMap]
  );

  const displayParties = useMemo(
    () => (partiesWithSSN.length > 0 ? partiesWithSSN : contractParties),
    [partiesWithSSN, contractParties]
  );

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

  const { lesseeNoticeIndex, lessorNoticeIndex, allNoticeIndex, invoiceInfoIndex } = useMemo(() => {
    const defaults = {
      allNoticeIndex: 0,
      lesseeNoticeIndex: 1,
      lessorNoticeIndex: 2,
      invoiceInfoIndex: 0,
    };

    if (!existingContract || !isLeaseAgreement(existingContract.type)) {
      return defaults;
    }

    const terms = existingContract.notice?.terms;
    const extraParams = existingContract.extraParameters ?? [];

    const findTerm = (party: string, fallback: number) => {
      const idx = terms?.findIndex((n) => n.party === party) ?? -1;
      return idx === -1 ? fallback : idx;
    };

    const invoiceIdx = extraParams.findIndex((p) => p.name === 'InvoiceInfo');

    return {
      allNoticeIndex: findTerm('ALL', 0),
      lesseeNoticeIndex: findTerm('LESSEE', 1),
      lessorNoticeIndex: findTerm('LESSOR', 2),
      invoiceInfoIndex: invoiceIdx === -1 ? extraParams.length : invoiceIdx,
    };
  }, [existingContract]);

  const toPropertyDesignation = (pd: { name?: string } | string): string =>
    typeof pd === 'object' && pd.name ? pd.name : typeof pd === 'string' ? pd : '';

  const saveButton = (section?: string) => {
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
                  onSave?.({ ...getValues() }, section).then(() => {
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

  const handleOpenAddModal = () => {
    setPartyModalMode('add');
    setEditingParty(undefined);
    setIsPartyModalOpen(true);
  };

  const handleOpenEditModal = (party: UnifiedContractParty) => {
    setPartyModalMode('edit');
    setEditingParty(party);
    setIsPartyModalOpen(true);
  };

  const handleModalSave = (stakeholderId: string, roles: StakeholderRole[]) => {
    if (partyModalMode === 'add') {
      onAddParty?.(stakeholderId, roles);
    } else {
      onEditPartyRoles?.(stakeholderId, roles);
    }
  };

  const unifiedPartyTable = () => (
    <>
      <Table dense background data-cy="parties-table">
        <Table.Header>
          <Table.HeaderColumn>Namn</Table.HeaderColumn>
          <Table.HeaderColumn>Adress</Table.HeaderColumn>
          <Table.HeaderColumn>Roll</Table.HeaderColumn>
          <Table.HeaderColumn className="w-[60px]"></Table.HeaderColumn>
        </Table.Header>
        <Table.Body>
          {displayParties.length > 0 ? (
            displayParties.map((party, idx) => (
              <Table.Row key={`party-row-${idx}`} data-cy={`party-row-${idx}`} className="relative">
                <Table.Column className="flex flex-col items-start justify-center !gap-0" data-cy={`party-${idx}-name`}>
                  <div>
                    <strong>{party.name}</strong>
                  </div>
                  <div>{party.personalNumber || party.organizationNumber}</div>
                </Table.Column>
                <Table.Column
                  className="flex flex-col items-start justify-center !gap-0"
                  data-cy={`party-${idx}-address`}
                >
                  {party.address.street && party.address.postalCode && party.address.city ? (
                    <>
                      <div>
                        <strong>{party.address.street}</strong>
                      </div>
                      {party.address.careOf && <div>{party.address.careOf}</div>}
                      <div>
                        {party.address.postalCode} {party.address.city}
                      </div>
                    </>
                  ) : (
                    <strong>(saknas)</strong>
                  )}
                </Table.Column>
                <Table.Column className="flex flex-col items-start justify-center !gap-0" data-cy={`party-${idx}-role`}>
                  {party.roles.length > 0 ? (
                    party.roles
                      .filter((r) => r !== StakeholderRole.CONTACT_PERSON)
                      .map((role, roleIdx) => <div key={`role-${roleIdx}`}>{prettyContractRoles[role]}</div>)
                  ) : (
                    <strong>(saknas)</strong>
                  )}
                </Table.Column>
                <Table.Column className="!p-0">
                  {!readOnly && (isDraft || isEditable('lessee')) && (
                    <div className="flex items-center gap-2">
                      {/* TODO: Restore PopupMenu when Table component supports overflow popups
                      <PopupMenu position="right">
                        <PopupMenu.Button iconButton variant="ghost" aria-label="Alternativ" data-cy={`party-${idx}-menu-button`}>
                          <Ellipsis />
                        </PopupMenu.Button>
                        <PopupMenu.Panel>
                          <PopupMenu.Items>
                            <PopupMenu.Group>
                              <PopupMenu.Item>
                                <Button leftIcon={<Pencil size={18} />} variant="ghost" data-cy={`party-${idx}-edit-button`} onClick={() => handleOpenEditModal(party)}>
                                  Redigera roll
                                </Button>
                              </PopupMenu.Item>
                            </PopupMenu.Group>
                            {isDraft && (
                              <PopupMenu.Group>
                                <PopupMenu.Item>
                                  <Button leftIcon={<Trash size={18} />} variant="ghost" data-cy={`party-${idx}-remove-button`} onClick={() => onRemoveParty?.(party.stakeholderId)}>
                                    Ta bort part
                                  </Button>
                                </PopupMenu.Item>
                              </PopupMenu.Group>
                            )}
                          </PopupMenu.Items>
                        </PopupMenu.Panel>
                      </PopupMenu>
                      */}
                      <Button
                        iconButton
                        variant="ghost"
                        size="sm"
                        aria-label="Redigera roll"
                        data-cy={`party-${idx}-edit-button`}
                        onClick={() => handleOpenEditModal(party)}
                      >
                        <Pencil size={18} />
                      </Button>
                      {isDraft && (
                        <Button
                          iconButton
                          variant="ghost"
                          size="sm"
                          aria-label="Ta bort part"
                          data-cy={`party-${idx}-remove-button`}
                          onClick={() => {
                            confirm
                              .showConfirmation(
                                'Ta bort part',
                                'Vill du ta bort denna part från avtalet?',
                                'Ja',
                                'Nej',
                                'info',
                                'info'
                              )
                              .then((confirmed) => {
                                if (confirmed) {
                                  onRemoveParty?.(party.stakeholderId);
                                }
                              });
                          }}
                        >
                          <Trash size={18} />
                        </Button>
                      )}
                    </div>
                  )}
                </Table.Column>
              </Table.Row>
            ))
          ) : (
            <Table.Row>
              <Table.Column colSpan={4} className="flex flex-col items-start justify-center !gap-0">
                <div>
                  <strong>Inga parter tillagda</strong>
                </div>
              </Table.Column>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
      {!readOnly && onAddParty && (
        <div className="mt-12">
          <Button size="sm" variant="secondary" data-cy="add-party-button" onClick={handleOpenAddModal}>
            Lägg till ny part
          </Button>
        </div>
      )}
    </>
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
            {unifiedPartyTable()}
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
            <Disclosure.Title>Avtalstid och uppsägningsvillkor</Disclosure.Title>
            {(formState.errors.notice?.terms?.length ?? 0) > 0 ||
            formState.errors.extension?.leaseExtension ||
            !!formState.errors.currentPeriod ? (
              <Label className="w-[15rem]" rounded inverted color={'error'}>
                Fel i formulär
              </Label>
            ) : null}
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div className="flex flex-col gap-24">
              <div className="flex gap-18 justify-start">
                <FormControl id="startDate" className="w-full">
                  <FormLabel>Avtalet gäller från</FormLabel>
                  <Input
                    type="date"
                    min={dayjs().format('YYYY-MM-DD')}
                    readOnly={!isEditable('general')}
                    {...register('currentPeriod.startDate')}
                    data-cy="avtalstid-start"
                  />
                  {formState.errors.currentPeriod?.startDate && (
                    <div className="my-sm text-error">
                      <FormErrorMessage>{formState.errors.currentPeriod?.startDate?.message}</FormErrorMessage>
                    </div>
                  )}
                </FormControl>
                <FormControl id="endDate" className="w-full">
                  <FormLabel>Avtalet gäller till och med</FormLabel>
                  <Input
                    type="date"
                    min={getValues().currentPeriod?.startDate || dayjs().format('YYYY-MM-DD')}
                    readOnly={!isEditable('general')}
                    {...register('currentPeriod.endDate')}
                    data-cy="avtalstid-end"
                  />
                </FormControl>
              </div>
              {getValues().notice?.terms?.some((t) => t.party === 'LESSOR') &&
              getValues().notice?.terms?.some((t) => t.party === 'LESSEE') ? (
                <>
                  <strong>Ange tid för nyttjanderättshavarens uppsägningstid</strong>
                  <div className="flex justify-between gap-32 items-start mb-md">
                    <FormControl id={`noticePeriod-1`} className="flex-grow max-w-[45%]">
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
                    <FormControl id={`noticePeriod-2`} className="flex-grow max-w-[45%]">
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
                </>
              ) : (
                <>
                  <strong className="-mb-16">Ange uppsägningstid</strong>
                  <div className="flex justify-between gap-32 items-start mb-md">
                    <FormControl id={`noticePeriod-0`} className="flex-grow max-w-[45%]">
                      <FormLabel>Enhet</FormLabel>
                      <Select
                        className="w-full"
                        disabled={!isEditable('general')}
                        {...register(`notice.terms.${allNoticeIndex}.unit`)}
                        placeholder="Månad/år"
                        data-cy="all-notice-unit"
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
                        {...register(`notice.terms.${allNoticeIndex}.periodOfNotice`)}
                        placeholder="Ange tal"
                        data-cy="all-notice-period"
                      />
                      <Input
                        type="hidden"
                        readOnly
                        {...register(`notice.terms.${allNoticeIndex}.party`)}
                        value="ALL"
                        data-cy="all-notice-party"
                      />
                      {formState.errors.notice?.terms?.[allNoticeIndex]?.periodOfNotice && (
                        <div className="my-sm text-error">
                          <FormErrorMessage>
                            {formState.errors.notice?.terms?.[allNoticeIndex]?.periodOfNotice?.message}
                          </FormErrorMessage>
                        </div>
                      )}
                    </FormControl>
                  </div>
                </>
              )}

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
      {errand?.caseType === MEXCaseType.UPDATECONTRACT || errand?.caseType === MEXCaseType.MEX_TERMINATION_OF_LEASE ? (
        <Disclosure variant="alt">
          <Disclosure.Header>
            <Disclosure.Icon icon={<Calendar />} />
            <Disclosure.Title>Uppsägning anmälan</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <div className="flex gap-18 justify-start">
              <FormControl id="noticeDate" className="w-full">
                <FormLabel>Uppsägningsdatum</FormLabel>
                <Input
                  type="date"
                  readOnly={!isEditable('cancellation')}
                  {...register('notice.noticeDate')}
                  data-cy="notice-date"
                />
              </FormControl>
              <FormControl id="endDate" className="w-full">
                <FormLabel>Slutdatum</FormLabel>
                <Input type="date" readOnly={!isEditable('cancellation')} {...register('endDate')} data-cy="endDate" />
              </FormControl>
            </div>
            <div className="flex gap-18 justify-start">
              <FormControl id="noticeGivenBy" className="w-full">
                <FormLabel>Uppsagd av</FormLabel>
                <Select
                  className="w-full"
                  disabled={!isEditable('cancellation')}
                  {...register('notice.noticeGivenBy')}
                  data-cy="notice-given-by"
                >
                  <Select.Option value="">Välj part</Select.Option>
                  <Select.Option value={Party.LESSOR}>Upplåtare</Select.Option>
                  <Select.Option value={Party.LESSEE}>Arrendator</Select.Option>
                </Select>
              </FormControl>
            </div>
            {saveButton()}
          </Disclosure.Content>
        </Disclosure>
      ) : null}
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
                    <FormControl
                      className="flex-grow"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        if (!isEditable('general')) return;
                        setValue('invoicing.invoicedIn', e.target.value as InvoicedIn);
                      }}
                    >
                      <FormLabel>Avgift ska betalas</FormLabel>
                      <RadioButton.Group
                        inline
                        className="flex gap-24"
                        name="invoicedIn"
                        value={
                          watch().invoicing?.invoicedIn === InvoicedIn.ADVANCE
                            ? InvoicedIn.ADVANCE
                            : watch().invoicing?.invoicedIn === InvoicedIn.ARREARS
                            ? InvoicedIn.ARREARS
                            : InvoicedIn.ADVANCE
                        }
                      >
                        <RadioButton
                          value={InvoicedIn.ADVANCE}
                          data-cy="invoiced-in-advance-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Förskott
                        </RadioButton>
                        <RadioButton
                          value={InvoicedIn.ARREARS}
                          data-cy="invoiced-in-arrears-radiobutton"
                          disabled={!isEditable('general')}
                        >
                          Efterskott
                        </RadioButton>
                      </RadioButton.Group>
                    </FormControl>
                  </div>
                  <div className="flex gap-18 justify-start">
                    <FormControl className="w-[36.7rem]">
                      <FormLabel>Ange fakturans referens</FormLabel>
                      <Input
                        type="text"
                        readOnly={!isEditable('billing')}
                        {...register(`extraParameters.${invoiceInfoIndex}.parameters.markup`)}
                        data-cy="invoice-markup-input"
                      />
                      {referensError ? (
                        <FormErrorMessage>Referens måste alltid anges.</FormErrorMessage>
                      ) : (
                        <small>Referens måste alltid anges.</small>
                      )}

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
              {saveButton('billing')}
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

      <ContractPartyModal
        isOpen={isPartyModalOpen}
        onClose={() => setIsPartyModalOpen(false)}
        onSave={handleModalSave}
        mode={partyModalMode}
        stakeholderOptions={errandStakeholders ?? []}
        existingParty={editingParty}
        contractType={getValues().type}
        existingParties={contractParties}
        isDraft={isDraft}
      />
    </>
  );
};

export default ContractForm;
