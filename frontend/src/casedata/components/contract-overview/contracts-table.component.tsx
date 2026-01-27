import { Contract, ContractType, Stakeholder, StakeholderType } from '@casedata/interfaces/contracts';
import { contractTypes, leaseTypes } from '@casedata/services/contract-service';
import { Button, Input, Label, Pagination, Select, Spinner, Table } from '@sk-web-gui/react';
import { SortMode } from '@sk-web-gui/table';
import dayjs from 'dayjs';
import LucideIcon from '@sk-web-gui/lucide-icon';
import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';

export interface ContractTableForm {
  sortOrder: 'asc' | 'desc';
  sortColumn: string;
  page: number;
  size: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

const getContractTypeLabel = (type: ContractType): string => {
  return contractTypes.find((t) => t.key === type)?.label || '-';
};

const getLeaseTypeLabel = (leaseType?: string): string => {
  if (!leaseType) return '-';
  return leaseTypes.find((l) => l.key === leaseType)?.label || '-';
};

const getStakeholderName = (stakeholder: Stakeholder): string => {
  if (stakeholder.type === StakeholderType.PERSON) {
    return [stakeholder.firstName, stakeholder.lastName].filter(Boolean).join(' ');
  }
  return stakeholder.organizationName || '-';
};

const CasedataStatusLabelComponent: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'DRAFT':
      return (
        <Label rounded inverted={true} color="tertiary" className={`max-h-full h-auto text-center whitespace-nowrap`}>
          Utkast
        </Label>
      );
    case 'ACTIVE':
      return (
        <Label rounded inverted={true} color="gronsta" className={`max-h-full h-auto text-center whitespace-nowrap`}>
          Aktiv
        </Label>
      );
    case 'TERMINATED':
      return (
        <Label rounded inverted={false} color="tertiary" className={`max-h-full h-auto text-center whitespace-nowrap`}>
          Avslutad
        </Label>
      );
  }
};

const formatDate = (date?: string): string => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const formatPeriod = (start?: string, end?: string): React.ReactNode => {
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  if (startStr || endStr) {
    return (
      <div className="whitespace-nowrap">
        <div>{startStr || '-'}</div>
        <div>{endStr || '-'}</div>
      </div>
    );
  }
  return '-';
};

export const contractTableLabels = [
  { label: 'Status', sortable: true, column: 'status' },
  { label: 'Fastighetsbeteckning', sortable: false, column: 'propertyDesignations' },
  { label: 'Distrikt', sortable: false, column: 'district' },
  { label: 'Avtalstyp', sortable: true, column: 'type' },
  { label: 'Avtalssubtyp', sortable: true, column: 'leaseType' },
  { label: 'Parter', sortable: false, column: 'stakeholders' },
  { label: 'Avtalsperiod', sortable: true, column: 'end' },
  { label: 'Uppsägningsdatum', sortable: false, column: '' },
  { label: '', sortable: false, column: '' },
];

export const ContractsTable: React.FC<{
  contracts: Contract[];
  isLoading: boolean;
  onRowClick?: (contract: Contract) => void;
}> = ({ contracts, isLoading, onRowClick }) => {
  const { watch, setValue, register } = useFormContext<ContractTableForm>();
  const [rowHeight, setRowHeight] = useState<string>('normal');

  const sortOrder = watch('sortOrder');
  const sortColumn = watch('sortColumn');
  const totalPages = watch('totalPages');
  const page = watch('page');

  const sortOrders: { [key: string]: 'ascending' | 'descending' } = {
    asc: 'ascending',
    desc: 'descending',
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setValue('sortOrder', sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setValue('sortColumn', column);
    }
  };

  const headers = contractTableLabels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`}>
      {header.sortable ? (
        <Table.SortButton
          isActive={sortColumn === header.column}
          sortOrder={sortOrders[sortOrder] as SortMode}
          onClick={() => handleSort(header.column)}
        >
          {header.label}
        </Table.SortButton>
      ) : (
        header.label
      )}
    </Table.HeaderColumn>
  ));

  const rows = contracts.map((contract, index) => {
    const status = contract.status || '-';
    const propertyNames =
      contract.propertyDesignations
        ?.map((p) => p.name)
        .filter(Boolean)
        .join(', ') || '-';
    const districts = contract.propertyDesignations?.map((p) => p.district).filter(Boolean);
    const uniqueDistricts = [...new Set(districts)].join(', ') || '-';
    const partyNames = contract.stakeholders?.map(getStakeholderName).filter(Boolean) || [];
    const parties =
      partyNames.length > 0 ? (
        <div className="whitespace-nowrap">
          {partyNames.map((name, i) => (
            <div key={i}>{name}</div>
          ))}
        </div>
      ) : (
        '-'
      );
    const period = formatPeriod(contract.start, contract.end);

    const lessorNoticeDate = (contract) => {
      const notice = contract.notices.find((notice) => notice.party === 'LESSOR');
      const period = notice.periodOfNotice;
      const endDate = dayjs(contract.end);
      if (!endDate.isValid()) return '-';
      let noticeDate;
      switch (notice.unit) {
        case 'YEARS':
          noticeDate = endDate.subtract(period, 'year');
          break;
        case 'MONTHS':
          noticeDate = endDate.subtract(period, 'month');
          break;
        case 'DAYS':
          noticeDate = endDate.subtract(period, 'day');
          break;
        default:
          return '-';
      }
      return noticeDate?.format('YYYY-MM-DD') ?? '-';
    };

    return (
      <Table.Row
        key={contract.contractId || index}
        className={onRowClick ? 'cursor-pointer hover:bg-background-200' : ''}
        onClick={() => onRowClick?.(contract)}
        data-cy={`contract-row-${index}`}
      >
        <Table.Column>{<CasedataStatusLabelComponent status={status} />}</Table.Column>
        <Table.Column>{propertyNames}</Table.Column>
        <Table.Column>{uniqueDistricts}</Table.Column>
        <Table.Column>
          <div className="flex flex-col">
            <div>{getContractTypeLabel(contract.type)}</div> <div>{contract?.contractId ?? '-'}</div>
          </div>
        </Table.Column>
        <Table.Column>{getLeaseTypeLabel(contract.leaseType)}</Table.Column>
        <Table.Column>{parties}</Table.Column>
        <Table.Column>{period}</Table.Column>
        <Table.Column>{lessorNoticeDate(contract)}</Table.Column>
        <Table.Column>
          <Button
            variant="tertiary"
            size="sm"
            iconButton
            leftIcon={<LucideIcon name={'arrow-right'} />}
            onClick={() => onRowClick?.(contract)}
          ></Button>
        </Table.Column>
      </Table.Row>
    );
  });

  return (
    <div className="max-w-full relative">
      {isLoading && (
        <div className="z-100 absolute bg-background-content opacity-50 w-full h-[50rem] flex items-center justify-center">
          <Spinner size={5} />
        </div>
      )}

      {!isLoading && contracts.length === 0 && <div className="py-32 text-center">Inga avtal hittades</div>}

      <Table data-cy="contracts-table" dense={rowHeight === 'dense'} scrollable>
        {contracts.length > 0 && (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>{rows}</Table.Body>
          </>
        )}

        {contracts.length > 0 && (
          <Table.Footer>
            <div className="sk-table-bottom-section sk-table-pagination-mobile">
              <label className="sk-table-bottom-section-label" htmlFor="paginationSelect">
                Sida:
              </label>
              <Select
                id="paginationSelect"
                size="sm"
                variant="tertiary"
                value={(page || 1).toString()}
                onSelectValue={(value) => {
                  setValue('page', parseInt(value, 10));
                }}
              >
                {totalPages &&
                  Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Select.Option key={`pagipage-${p}`} value={p}>
                      {p}
                    </Select.Option>
                  ))}
              </Select>
            </div>
            <div className="sk-table-bottom-section">
              <label className="sk-table-bottom-section-label" htmlFor="pageSize">
                Rader per sida:
              </label>
              <Input
                {...register('pageSize')}
                size="sm"
                id="pageSize"
                type="number"
                min={1}
                max={1000}
                className="max-w-[6rem]"
              />
            </div>
            <div className="sk-table-paginationwrapper">
              <Pagination
                showFirst
                showLast
                pagesBefore={1}
                pagesAfter={1}
                showConstantPages={true}
                fitContainer
                pages={totalPages}
                activePage={page}
                changePage={(p) => {
                  setValue('page', p);
                }}
              />
            </div>
            <div className="sk-table-bottom-section">
              <label className="sk-table-bottom-section-label" htmlFor="rowHeight">
                Radhöjd:
              </label>
              <Select
                size="sm"
                id="rowHeight"
                variant="tertiary"
                onChange={(e) => setRowHeight(e.target.value)}
                value={rowHeight}
              >
                <Select.Option value="normal">Normal</Select.Option>
                <Select.Option value="dense">Tät</Select.Option>
              </Select>
            </div>
          </Table.Footer>
        )}
      </Table>
    </div>
  );
};
