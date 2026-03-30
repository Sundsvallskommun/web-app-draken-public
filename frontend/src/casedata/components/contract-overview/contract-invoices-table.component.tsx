import {
  ContractInvoice,
  fetchContractInvoices,
  invoiceStatusColors,
  invoiceStatusLabels,
} from '@casedata/services/contract-service';
import { formatCurrency } from '@common/services/helper-service';
import { Button, Label, Pagination, Spinner, Table } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Download } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

interface ContractInvoicesTableProps {
  contractId?: string;
  municipalityId: string;
}

export const ContractInvoicesTable: React.FC<ContractInvoicesTableProps> = ({ contractId, municipalityId }) => {
  const [invoices, setInvoices] = useState<ContractInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const pageSize = 5;

  const loadInvoices = useCallback(async () => {
    if (!contractId || !municipalityId) {
      return;
    }

    setLoading(true);
    try {
      const result = await fetchContractInvoices(municipalityId, contractId, page, pageSize);
      setInvoices(result.invoices);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('Failed to load contract invoices:', error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [contractId, municipalityId, page]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleDownloadPdf = (invoiceId: string) => {
    // TODO: Implement PDF download functionality
    console.log('Download PDF for invoice:', invoiceId);
  };

  if (!contractId) {
    return (
      <div className="text-dark-disabled" data-cy="invoices-no-contract">
        Spara avtalet för att se fakturor.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-lg" data-cy="invoices-loading">
        <Spinner size={3} />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-dark-disabled" data-cy="invoices-empty">
        Inga fakturor finns kopplade till detta avtal.
      </div>
    );
  }

  const headers = [
    { label: 'Status', key: 'status' },
    { label: 'Fakturadatum', key: 'invoiceDate' },
    { label: 'Förfallodatum', key: 'dueDate' },
    { label: 'Belopp', key: 'amount' },
    { label: 'Fakturanummer', key: 'invoiceNumber' },
    { label: 'Åtgärd', key: 'action', screenReaderOnly: true },
  ];

  return (
    <div className="max-w-full" data-cy="contract-invoices-table">
      <Table dense scrollable>
        <Table.Header>
          {headers.map((header, index) => (
            <Table.HeaderColumn key={`header-${index}`}>
              {header.screenReaderOnly ? <span className="sr-only">{header.label}</span> : header.label}
            </Table.HeaderColumn>
          ))}
        </Table.Header>
        <Table.Body>
          {invoices.map((invoice, index) => (
            <Table.Row key={`invoice-row-${index}`} data-cy={`invoice-row-${index}`}>
              <Table.Column>
                <Label rounded inverted color={invoiceStatusColors[invoice.status]} data-cy={`invoice-status-${index}`}>
                  {invoiceStatusLabels[invoice.status]}
                </Label>
              </Table.Column>
              <Table.Column data-cy={`invoice-date-${index}`}>
                {invoice.invoiceDate ? dayjs(invoice.invoiceDate).format('YYYY-MM-DD') : '-'}
              </Table.Column>
              <Table.Column data-cy={`invoice-due-date-${index}`}>
                {invoice.dueDate ? dayjs(invoice.dueDate).format('YYYY-MM-DD') : '-'}
              </Table.Column>
              <Table.Column data-cy={`invoice-amount-${index}`}>
                {invoice.amount !== undefined ? formatCurrency(invoice.amount) : '-'}
              </Table.Column>
              <Table.Column data-cy={`invoice-number-${index}`}>{invoice.invoiceNumber || '-'}</Table.Column>
              <Table.Column>
                <Button
                  size="sm"
                  variant="tertiary"
                  onClick={() => handleDownloadPdf(invoice.id)}
                  data-cy={`invoice-download-pdf-${index}`}
                  disabled
                  title="Hämta pdf (kommande funktion)"
                >
                  <Download size={16} />
                  <span className="ml-sm">Hämta pdf</span>
                </Button>
              </Table.Column>
            </Table.Row>
          ))}
        </Table.Body>
        {totalPages > 1 && (
          <Table.Footer>
            <div className="sk-table-paginationwrapper">
              <Pagination
                showFirst
                showLast
                pagesBefore={1}
                pagesAfter={1}
                showConstantPages={true}
                fitContainer
                pages={totalPages}
                activePage={page + 1}
                changePage={(newPage) => {
                  setPage(newPage - 1);
                }}
              />
            </div>
            <div className="sk-table-bottom-section">
              <span className="text-md text-dark-secondary">
                Visar {invoices.length} av {totalCount} fakturor
              </span>
            </div>
          </Table.Footer>
        )}
      </Table>
    </div>
  );
};

export default ContractInvoicesTable;
