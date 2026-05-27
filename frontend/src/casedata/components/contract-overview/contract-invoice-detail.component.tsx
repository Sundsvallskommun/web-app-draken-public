import { invoiceStatusColors, invoiceStatusLabels } from '@casedata/services/contract-service';
import { formatCurrency } from '@common/services/helper-service';
import { Label, Table } from '@sk-web-gui/react';
import { FC } from 'react';
import { CBillingRecord } from 'src/data-contracts/backend/data-contracts';

interface ContractInvoiceDetailProps {
  record: CBillingRecord;
  showStatus?: boolean;
}

export const ContractInvoiceDetail: FC<ContractInvoiceDetailProps> = ({ record, showStatus = true }) => {
  const recipientName =
    record.recipient?.organizationName ||
    `${record.recipient?.firstName || ''} ${record.recipient?.lastName || ''}`.trim();
  const address = record.recipient?.addressDetails;

  return (
    <div className="bg-background-100 rounded-16 p-32 flex flex-col gap-24">
      {showStatus && (
        <div className="flex flex-row">
          <Label rounded inverted color={invoiceStatusColors[record.status]}>
            {invoiceStatusLabels[record.status]}
          </Label>
        </div>
      )}

      <div className="w-full flex flex-row">
        <div className="flex flex-row gap-32 w-full">
          <div className="flex flex-col">
            <span className="text-label-medium">Fakturamottagare</span>
            <span>{recipientName || '-'}</span>
            {address && (
              <span>
                {address.street}, {address.postalCode} {address.city}
              </span>
            )}
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

      {record.invoice?.description && (
        <div className="flex flex-col">
          <span className="text-label-medium">Avitext</span>
          <span>{record.invoice.description}</span>
        </div>
      )}

      {record.invoice?.invoiceRows?.length > 0 && (
        <Table dense>
          <Table.Header>
            <Table.HeaderColumn>Beskrivning</Table.HeaderColumn>
            <Table.HeaderColumn>Antal</Table.HeaderColumn>
            <Table.HeaderColumn>Pris</Table.HeaderColumn>
            <Table.HeaderColumn>Summa</Table.HeaderColumn>
          </Table.Header>
          {record.invoice.invoiceRows.map((row, rowIndex) => {
            const accountInfo = row.accountInformation?.[0];
            return (
              <tbody key={rowIndex}>
                <Table.Row className="!border-b-0">
                  <Table.Column className="!items-start">
                    <div className="flex flex-col w-[36rem]">
                      <span className="font-bold mt-6">{row.descriptions?.join(', ') || '-'}</span>
                      {row.detailedDescriptions?.some((d: string) => d) && (
                        <div className="py-4">
                          {row.detailedDescriptions
                            .filter((d: string) => d)
                            .map((desc: string, descIndex: number) => (
                              <span key={descIndex} className="text-small text-dark-secondary block">
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
                    <span className="whitespace-nowrap mt-6">{formatCurrency(row.costPerUnit || 0)}</span>
                  </Table.Column>
                  <Table.Column className="-mr-18 !items-start">
                    <span className="whitespace-nowrap mt-6">
                      {formatCurrency((row.quantity || 0) * (row.costPerUnit || 0))}
                    </span>
                  </Table.Column>
                </Table.Row>
                {accountInfo && (
                  <tr className="border-b-1 border-divider">
                    <td colSpan={4} className="pl-16 pb-8 pt-2">
                      <span className="text-small text-dark-secondary italic">
                        Ansvar: {accountInfo.costCenter || '-'}, Underkonto: {accountInfo.subaccount || '-'},
                        Verksamhet: {accountInfo.department || '-'}, Aktivitet: {accountInfo.activity || '-'}, Projekt:{' '}
                        {accountInfo.project || '-'}, Objekt: {accountInfo.article || '-'}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </Table>
      )}

      {record.invoice?.totalAmount !== undefined && (
        <div className="flex justify-end">
          <span className="text-label-medium">Totalt: {formatCurrency(record.invoice.totalAmount)}</span>
        </div>
      )}
    </div>
  );
};
