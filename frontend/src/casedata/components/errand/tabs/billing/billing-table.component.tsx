import { IErrand } from '@casedata/interfaces/errand';
import { casedataInvoiceSettings } from '@casedata/services/billing/casedata-invoice-settings';
import {
  approveCasedataBillingRecord,
  deleteCasedataBillingRecord,
  updateCasedataBillingRecord,
} from '@casedata/services/casedata-billing-service';
import { Button, DatePicker, FormControl, FormLabel, Input, Table, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { Pen, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CBillingRecord, CBillingRecordStatusEnum, CInvoiceRow } from 'src/data-contracts/backend/data-contracts';

import { BillingStatusLabel } from './billing-status-label.component';

interface BillingTableProps {
  errand: IErrand;
  billingRecords: CBillingRecord[];
  onDeleteRecord: (recordId: string) => void;
  onUpdateRecord: (record: CBillingRecord) => void;
}

interface EditFormState {
  ourReference: string;
  customerReference: string;
  date: string;
  description: string;
  invoiceRows: CInvoiceRow[];
}

interface EditRowState {
  rowIndex: number;
  descriptions: string;
  detailedDescription1: string;
  detailedDescription2: string;
  detailedDescription3: string;
  quantity: number | '';
  costPerUnit: number | '';
  costCenter: string;
  subaccount: string;
  department: string;
  activity: string;
  project: string;
  object: string;
}

export const BillingTable: React.FC<BillingTableProps> = ({
  errand,
  billingRecords,
  onDeleteRecord,
  onUpdateRecord,
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const toastMessage = useSnackbar();
  const confirm = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormState, setEditFormState] = useState<EditFormState | null>(null);
  const [editingRowState, setEditingRowState] = useState<EditRowState | null>(null);

  const startEditing = (record: CBillingRecord) => {
    setEditingRecordId(record.id ?? null);
    setEditFormState({
      ourReference: record.invoice?.ourReference || '',
      customerReference: record.invoice?.customerReference || '',
      date: record.invoice?.date || '',
      description: record.invoice?.description || '',
      invoiceRows: [...record.invoice.invoiceRows],
    });
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditFormState(null);
    setEditingRowState(null);
  };

  const handleFormChange = (field: keyof EditFormState, value: string) => {
    if (!editFormState) return;
    setEditFormState({
      ...editFormState,
      [field]: value,
    });
  };

  const handleSave = async (record: CBillingRecord) => {
    if (!editFormState) return;

    const today = new Date().toISOString().split('T')[0];
    if (editFormState.date && editFormState.date < today) {
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Aviseringsdatum kan inte vara i det förflutna',
        status: 'error',
      });
      return;
    }

    setSavingId(record.id ?? null);

    try {
      const updatedRecord: CBillingRecord = {
        ...record,
        invoice: {
          ...record.invoice,
          ourReference: editFormState.ourReference,
          customerReference: editFormState.customerReference,
          date: editFormState.date || undefined,
          description: editFormState.description,
          invoiceRows: editFormState.invoiceRows,
        },
        extraParameters: {
          errandId: record.extraParameters?.errandId ?? '',
          errandNumber: record.extraParameters?.errandNumber ?? '',
          facilities: record.extraParameters?.facilities ?? '',
          referenceName: editFormState.ourReference,
        },
      };

      const savedRecord = await updateCasedataBillingRecord(updatedRecord, municipalityId);
      onUpdateRecord(savedRecord);
      cancelEditing();

      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Faktura uppdaterad',
        status: 'success',
      });
    } catch (error) {
      console.error('Failed to update billing record:', error);
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Kunde inte uppdatera faktura',
        status: 'error',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleApprove = async (record: CBillingRecord) => {
    const confirmed = await confirm.showConfirmation(
      'Godkänn faktura',
      'Är du säker på att du vill godkänna denna faktura?',
      'Ja',
      'Avbryt',
      'info'
    );

    if (!confirmed) return;

    setApprovingId(record.id ?? null);

    try {
      const savedRecord = await approveCasedataBillingRecord(record, municipalityId);
      onUpdateRecord(savedRecord);

      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Faktura godkänd',
        status: 'success',
      });
    } catch (error) {
      console.error('Failed to approve billing record:', error);
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Kunde inte godkänna faktura',
        status: 'error',
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeleteRecord = async (record: CBillingRecord) => {
    const confirmed = await confirm.showConfirmation(
      'Ta bort faktura',
      'Är du säker på att du vill ta bort denna faktura?',
      'Ja, ta bort',
      'Avbryt',
      'error'
    );

    if (!confirmed) return;

    setDeletingId(record.id ?? null);

    if (!record.id) return;

    try {
      await deleteCasedataBillingRecord(errand, record.id!, municipalityId);
      onDeleteRecord(record.id!);
      cancelEditing();
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Faktura borttagen',
        status: 'success',
      });
    } catch (error) {
      console.error('Failed to delete billing record:', error);
      toastMessage({
        position: 'bottom',
        closeable: true,
        message: 'Kunde inte ta bort faktura',
        status: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const isRowFieldPreset = (record: CBillingRecord, rowIndex: number, field: string): boolean => {
    const originalRow = record.invoice.invoiceRows[rowIndex];
    if (!originalRow) return false;

    const accountInfo = originalRow.accountInformation?.[0];
    const service = casedataInvoiceSettings.services.find(
      (s) => originalRow.descriptions?.includes(s.description) || s.name === originalRow.descriptions?.[0]
    );

    // Check JSON config first
    if (service) {
      const serviceAccountField = field as keyof typeof service.accountInformation;
      if (['costCenter', 'subaccount', 'department', 'activity', 'project'].includes(field)) {
        if (service.accountInformation[serviceAccountField]) return true;
      }
      if (field === 'object' && service.accountInformation.object) return true;
      if (field === 'descriptions' && service.description) return true;
      if (field === 'detailedDescription1' && service.detailedDescriptions?.[0]) return true;
    }

    // Check saved values
    if (['costCenter', 'subaccount', 'department', 'activity', 'project'].includes(field)) {
      if (accountInfo?.[field as keyof typeof accountInfo]) return true;
    }
    if (field === 'object' && accountInfo?.article) return true;
    if (field === 'descriptions' && originalRow.descriptions?.some((d) => d)) return true;
    if (field === 'detailedDescription1' && originalRow.detailedDescriptions?.[0]) return true;

    return false;
  };

  const handleEditRow = (rowIndex: number) => {
    if (!editFormState) return;

    const row = editFormState.invoiceRows[rowIndex];
    const accountInfo = row.accountInformation?.[0];
    setEditingRowState({
      rowIndex,
      descriptions: row.descriptions?.join(', ') || '',
      detailedDescription1: row.detailedDescriptions?.[0] || '',
      detailedDescription2: row.detailedDescriptions?.[1] || '',
      detailedDescription3: row.detailedDescriptions?.[2] || '',
      quantity: row.quantity || 0,
      costPerUnit: row.costPerUnit || 0,
      costCenter: accountInfo?.costCenter || '',
      subaccount: accountInfo?.subaccount || '',
      department: accountInfo?.department || '',
      activity: accountInfo?.activity || '',
      project: accountInfo?.project || '',
      object: accountInfo?.article || '',
    });
  };

  const handleRowFieldChange = (field: keyof Omit<EditRowState, 'rowIndex'>, value: string | number) => {
    if (!editingRowState) return;
    setEditingRowState({
      ...editingRowState,
      [field]: value,
    });
  };

  const handleSaveRow = () => {
    if (!editFormState || !editingRowState) return;

    const quantity = editingRowState.quantity === '' ? 0 : editingRowState.quantity;
    const costPerUnit = editingRowState.costPerUnit === '' ? 0 : editingRowState.costPerUnit;

    const updatedRows = editFormState.invoiceRows.map((row, index) => {
      if (index === editingRowState.rowIndex) {
        const existingAccountInfo = row.accountInformation?.[0] || {};
        return {
          ...row,
          descriptions: [editingRowState.descriptions],
          detailedDescriptions: [
            editingRowState.detailedDescription1,
            editingRowState.detailedDescription2,
            editingRowState.detailedDescription3,
          ].filter((d) => d !== ''),
          quantity,
          costPerUnit,
          totalAmount: quantity * costPerUnit,
          accountInformation: [
            {
              ...existingAccountInfo,
              costCenter: editingRowState.costCenter,
              subaccount: editingRowState.subaccount,
              department: editingRowState.department,
              activity: editingRowState.activity,
              project: editingRowState.project,
              article: editingRowState.object,
              amount: quantity * costPerUnit,
            },
          ],
        };
      }
      return row;
    });

    setEditFormState({
      ...editFormState,
      invoiceRows: updatedRows,
    });
    setEditingRowState(null);
  };

  const handleCancelRowEdit = () => {
    setEditingRowState(null);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    if (!editFormState) return;

    const confirmed = await confirm.showConfirmation(
      'Ta bort fakturarad',
      'Är du säker på att du vill ta bort denna fakturarad?',
      'Ja, ta bort',
      'Avbryt',
      'error'
    );

    if (!confirmed) return;

    const updatedRows = editFormState.invoiceRows.filter((_, index) => index !== rowIndex);
    setEditFormState({
      ...editFormState,
      invoiceRows: updatedRows,
    });
  };

  if (billingRecords.length === 0) {
    return <span className="italic">Inga fakturor skapade</span>;
  }

  return (
    <div className="flex flex-col gap-24">
      {billingRecords.map((record) => {
        const isEditing = editingRecordId === record.id;
        const displayRows = isEditing && editFormState ? editFormState.invoiceRows : record.invoice.invoiceRows;
        const isPastDue = record.invoice?.date ? new Date(record.invoice.date) < new Date() : false;

        return (
          <div key={record.id} className="bg-background-100 rounded-16 p-32 flex flex-col gap-24">
            <div className="flex flex-row">
              <BillingStatusLabel status={record.status} />{' '}
              <span className="text-small italic ml-6 mt-4">
                {record.status === CBillingRecordStatusEnum.NEW && (
                  <>
                    Du behöver även godkänna underlaget för att fakturan ska kunna skickas enligt önskat
                    aviseringsdatum.
                  </>
                )}
                {record.status === CBillingRecordStatusEnum.APPROVED && (
                  <>Fakturan går att redigera fram till fakturans aviseringsdatum.</>
                )}
              </span>
            </div>
            {!isEditing ? (
              <>
                <div className="w-full flex flex-row">
                  <div className="flex flex-row gap-32 w-full">
                    <div className="flex flex-col">
                      <span className="text-label-medium">Fakturamottagare</span>
                      <span>
                        {record.recipient?.organizationName ||
                          `${record.recipient?.firstName || ''} ${record.recipient?.lastName || ''}`.trim()}
                      </span>
                      <span>
                        {record.recipient?.addressDetails?.street}, {record.recipient?.addressDetails?.postalCode}{' '}
                        {record.recipient?.addressDetails?.city}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label-medium">Vår referens</span>
                      <span>{record.invoice?.ourReference || record?.extraParameters?.referenceName || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label-medium">Kundens referens</span>
                      <span>{record.invoice?.customerReference || '-'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-label-medium">Aviseringsdatum</span>
                      <span>{record.invoice?.date || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-label-medium">Avitext</span>
                  <span>{record.invoice?.description || '-'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col">
                  <span className="text-label-medium">Fakturamottagare</span>
                  <span>
                    {record.recipient?.organizationName ||
                      `${record.recipient?.firstName || ''} ${record.recipient?.lastName || ''}`.trim()}
                  </span>
                  <span>
                    {record.recipient?.addressDetails?.street}, {record.recipient?.addressDetails?.postalCode}{' '}
                    {record.recipient?.addressDetails?.city}
                  </span>
                </div>
                <div className="flex flex-row w-full gap-24">
                  <FormControl className="w-full">
                    <FormLabel>Vår referens</FormLabel>
                    <Input
                      placeholder="Ange vår referens"
                      value={editFormState?.ourReference || ''}
                      onChange={(e) => handleFormChange('ourReference', e.target.value)}
                    />
                  </FormControl>
                  <FormControl className="w-full">
                    <FormLabel>Kundens referens</FormLabel>
                    <Input
                      placeholder="Ange kundens referens"
                      value={editFormState?.customerReference || ''}
                      onChange={(e) => handleFormChange('customerReference', e.target.value)}
                    />
                  </FormControl>
                  <FormControl className="w-full">
                    <FormLabel>Aviseringsdatum</FormLabel>
                    <DatePicker
                      min={new Date().toISOString().split('T')[0]}
                      value={editFormState?.date || ''}
                      onChange={(e) => handleFormChange('date', e.target.value)}
                    />
                  </FormControl>
                </div>

                <FormControl className="w-full">
                  <FormLabel>Avitext</FormLabel>
                  <Input
                    className="w-full"
                    maxLength={30}
                    value={editFormState?.description || ''}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                  />
                </FormControl>
              </>
            )}

            <Table dense>
              <Table.Header>
                <Table.HeaderColumn>Beskrivning</Table.HeaderColumn>
                <Table.HeaderColumn>Antal</Table.HeaderColumn>
                <Table.HeaderColumn>Pris</Table.HeaderColumn>
                <Table.HeaderColumn>Summa</Table.HeaderColumn>
                {isEditing && (
                  <>
                    <Table.HeaderColumn></Table.HeaderColumn>
                    <Table.HeaderColumn></Table.HeaderColumn>
                  </>
                )}
              </Table.Header>
              {displayRows.map((row, rowIndex) => {
                const isEditingRow = isEditing && editingRowState?.rowIndex === rowIndex;
                const colCount = isEditing ? 6 : 4;

                if (isEditingRow && editingRowState) {
                  return (
                    <tbody key={rowIndex}>
                      <tr>
                        <td colSpan={colCount} className="p-0">
                          <div className="flex flex-col gap-16 bg-background-color-mixin-1 p-18">
                            <div className="flex flex-row w-full gap-16">
                              <FormControl className="w-full">
                                <div className="flex w-full justify-between">
                                  <FormLabel>Beskrivning</FormLabel>
                                  <span className="text-small text-dark-secondary">
                                    {editingRowState.descriptions.length}/30
                                  </span>
                                </div>
                                <Input
                                  maxLength={30}
                                  value={editingRowState.descriptions}
                                  onChange={(e) => handleRowFieldChange('descriptions', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'descriptions')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Antal</FormLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={editingRowState.quantity}
                                  onChange={(e) =>
                                    handleRowFieldChange(
                                      'quantity',
                                      e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                  }
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Pris</FormLabel>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={editingRowState.costPerUnit}
                                  onChange={(e) =>
                                    handleRowFieldChange(
                                      'costPerUnit',
                                      e.target.value === '' ? '' : parseFloat(e.target.value)
                                    )
                                  }
                                  readOnly={isRowFieldPreset(record, rowIndex, 'costPerUnit')}
                                />
                              </FormControl>
                            </div>
                            <div className="flex flex-row w-full gap-16">
                              <FormControl className="w-full">
                                <FormLabel>Ansvar</FormLabel>
                                <Input
                                  value={editingRowState.costCenter}
                                  onChange={(e) => handleRowFieldChange('costCenter', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'costCenter')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Underkonto</FormLabel>
                                <Input
                                  value={editingRowState.subaccount}
                                  onChange={(e) => handleRowFieldChange('subaccount', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'subaccount')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Verksamhet</FormLabel>
                                <Input
                                  value={editingRowState.department}
                                  onChange={(e) => handleRowFieldChange('department', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'department')}
                                />
                              </FormControl>
                            </div>
                            <div className="flex flex-row w-full gap-16">
                              <FormControl className="w-full">
                                <FormLabel>Aktivitet</FormLabel>
                                <Input
                                  value={editingRowState.activity}
                                  onChange={(e) => handleRowFieldChange('activity', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'activity')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Projekt</FormLabel>
                                <Input
                                  value={editingRowState.project}
                                  onChange={(e) => handleRowFieldChange('project', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'project')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <FormLabel>Objekt</FormLabel>
                                <Input
                                  value={editingRowState.object}
                                  onChange={(e) => handleRowFieldChange('object', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'object')}
                                />
                              </FormControl>
                            </div>
                            <div className="flex flex-col w-full gap-16">
                              <FormControl className="w-full">
                                <FormLabel>Utökad beskrivning</FormLabel>
                                <div className="flex w-full justify-between">
                                  <FormLabel>Rad 1</FormLabel>
                                  <span className="text-small text-dark-secondary">
                                    {editingRowState.detailedDescription1.length}/51
                                  </span>
                                </div>
                                <Input
                                  maxLength={51}
                                  value={editingRowState.detailedDescription1}
                                  onChange={(e) => handleRowFieldChange('detailedDescription1', e.target.value)}
                                  readOnly={isRowFieldPreset(record, rowIndex, 'detailedDescription1')}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <div className="flex w-full justify-between">
                                  <FormLabel>Rad 2</FormLabel>
                                  <span className="text-small text-dark-secondary">
                                    {editingRowState.detailedDescription2.length}/51
                                  </span>
                                </div>
                                <Input
                                  maxLength={51}
                                  value={editingRowState.detailedDescription2}
                                  onChange={(e) => handleRowFieldChange('detailedDescription2', e.target.value)}
                                />
                              </FormControl>
                              <FormControl className="w-full">
                                <div className="flex w-full justify-between">
                                  <FormLabel>Rad 3</FormLabel>
                                  <span className="text-small text-dark-secondary">
                                    {editingRowState.detailedDescription3.length}/51
                                  </span>
                                </div>
                                <Input
                                  maxLength={51}
                                  value={editingRowState.detailedDescription3}
                                  onChange={(e) => handleRowFieldChange('detailedDescription3', e.target.value)}
                                />
                              </FormControl>
                            </div>
                            <div className="flex flex-row gap-16">
                              <Button variant="secondary" onClick={handleCancelRowEdit}>
                                Avbryt
                              </Button>
                              <Button variant="primary" color="vattjom" onClick={handleSaveRow}>
                                Spara
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  );
                }

                const accountInfo = row.accountInformation?.[0];

                return (
                  <tbody key={rowIndex}>
                    <Table.Row className="!border-b-0">
                      <Table.Column className="!items-start">
                        <div className="flex flex-col w-[36rem]">
                          <span className="font-bold mt-6">{row.descriptions?.join(', ') || '-'}</span>
                          {row.detailedDescriptions?.some((d) => d) && (
                            <div className="py-4">
                              {row.detailedDescriptions
                                .filter((d) => d)
                                .map((desc, i) => (
                                  <span key={i} className="text-small text-dark-secondary block">
                                    {desc}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </Table.Column>
                      <Table.Column className="-mr-18 !items-start">
                        <span className="mt-6">{row.quantity || 0}</span>
                      </Table.Column>
                      <Table.Column className="-mr-18 !items-start">
                        <span className="whitespace-nowrap mt-6">{(row.costPerUnit || 0).toFixed(2)} kr</span>
                      </Table.Column>
                      <Table.Column className="-mr-18 !items-start">
                        <span className="whitespace-nowrap mt-6">
                          {((row.quantity || 0) * (row.costPerUnit || 0)).toFixed(2)} kr
                        </span>
                      </Table.Column>
                      {isEditing && (
                        <>
                          <Table.Column className="max-w-[3rem]">
                            <div className="mt-6">
                              <Button
                                size="sm"
                                variant="tertiary"
                                iconButton
                                onClick={() => handleEditRow(rowIndex)}
                                disabled={editingRowState !== null}
                              >
                                <Pen size={16} />
                              </Button>
                            </div>
                          </Table.Column>
                          <Table.Column className="max-w-[3rem] mr-10">
                            <div className="mt-6">
                              <Button
                                size="sm"
                                inverted
                                color="error"
                                iconButton
                                onClick={() => handleDeleteRow(rowIndex)}
                                disabled={editingRowState !== null}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </Table.Column>
                        </>
                      )}
                    </Table.Row>
                    {accountInfo && (
                      <tr className="border-b-1 border-divider">
                        <td colSpan={colCount} className="pl-16 pb-8 pt-2">
                          <span className="text-small text-dark-secondary italic">
                            Ansvar: {accountInfo.costCenter || '-'}, Underkonto: {accountInfo.subaccount || '-'},
                            Verksamhet: {accountInfo.department || '-'}, Aktivitet: {accountInfo.activity || '-'},
                            Projekt: {accountInfo.project || '-'}, Objekt: {accountInfo.article || '-'}
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </Table>

            <div className="flex flex-row justify-between items-center">
              <div className="flex flex-row gap-16">
                {!isEditing ? (
                  <>
                    <Button
                      variant="tertiary"
                      onClick={() => handleDeleteRecord(record)}
                      loading={deletingId === record.id}
                      disabled={isPastDue}
                    >
                      Ta bort
                    </Button>
                    <Button variant="secondary" onClick={() => startEditing(record)} disabled={isPastDue}>
                      Redigera
                    </Button>
                    {record.status === CBillingRecordStatusEnum.NEW && (
                      <Button
                        variant="primary"
                        onClick={() => handleApprove(record)}
                        loading={approvingId === record.id}
                        color={'vattjom'}
                      >
                        Godkänn underlag
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={cancelEditing} disabled={editingRowState !== null}>
                      Avbryt
                    </Button>
                    <Button
                      variant="primary"
                      color="vattjom"
                      onClick={() => handleSave(record)}
                      loading={savingId === record.id}
                      disabled={editingRowState !== null}
                    >
                      Spara
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
