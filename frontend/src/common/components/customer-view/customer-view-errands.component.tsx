'use client';

import { CaseLabels } from '@casedata/interfaces/case-label';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import {
  CaseStatusResponse,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { createRelation, deleteRelation, getResolvedRelations } from '@common/services/relations-service';
import { Button, Icon, Pagination, SearchField, Select, SortMode, Spinner, Table } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import dayjs from 'dayjs';
import { Link2, Link2Off } from 'lucide-react';
import { FC, useEffect, useState } from 'react';

interface CustomerViewErrandsProps {
  partyId: string;
  organizationNumber?: string;
  sourceErrandId?: string;
  onOpenMessage?: (errand: CaseStatusResponse) => void;
}

const caseTypeLabel = (errand: CaseStatusResponse) =>
  (CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType ?? '';

const formatDate = (date?: string) => (date ? dayjs(date).format('YYYY-MM-DD, HH:mm') : '-');

type SortColumn = 'status' | 'caseType' | 'firstSubmitted' | 'lastStatusChange';

const PAGE_SIZE = 20;

export const CustomerViewErrands: FC<CustomerViewErrandsProps> = ({
  partyId,
  organizationNumber,
  sourceErrandId,
  onOpenMessage,
}) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [errands, setErrands] = useState<CaseStatusResponse[]>();
  const [error, setError] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [query, setQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('firstSubmitted');
  const [sortOrder, setSortOrder] = useState<SortMode>(SortMode.DESC);
  const [busyCaseId, setBusyCaseId] = useState<string>();
  const [page, setPage] = useState(0);
  const [relationFilter, setRelationFilter] = useState<'all' | 'related'>('all');

  useEffect(() => {
    let active = true;
    const fetchStatuses = organizationNumber
      ? getStatusesUsingOrganizationNumber(municipalityId, organizationNumber)
      : getStatusesUsingPartyId(municipalityId, partyId);
    fetchStatuses
      .then((statuses: CaseStatusResponse[]) => {
        if (active) {
          setErrands(statuses.filter((s) => s.caseId !== sourceErrandId));
          setError(false);
        }
      })
      .catch(() => {
        if (active) {
          setErrands([]);
          setError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [municipalityId, partyId, organizationNumber, sourceErrandId]);

  const refreshRelations = () => {
    if (!sourceErrandId) return;
    getResolvedRelations('source', municipalityId, sourceErrandId, 'ASC')
      .then((res) => setRelations(res.relations))
      .catch(() => setRelations([]));
  };

  useEffect(() => {
    refreshRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId, sourceErrandId]);

  const relationFor = (errand: CaseStatusResponse) =>
    relations.find((relation) => relation.target.resourceId === errand.caseId);

  const handleRelate = (errand: CaseStatusResponse) => {
    if (!sourceErrandId || !errand.caseId) return;
    setBusyCaseId(errand.caseId);
    createRelation(municipalityId, sourceErrandId, errand)
      .then(() => refreshRelations())
      .catch((e) => console.error('Failed to create relation:', e))
      .finally(() => setBusyCaseId(undefined));
  };

  const handleUnrelate = (errand: CaseStatusResponse) => {
    const relation = relationFor(errand);
    if (!relation?.id) return;
    setBusyCaseId(errand.caseId);
    deleteRelation(municipalityId, relation.id)
      .then(() => refreshRelations())
      .catch((e) => console.error('Failed to delete relation:', e))
      .finally(() => setBusyCaseId(undefined));
  };

  const sortValue = (errand: CaseStatusResponse, column: SortColumn) => {
    if (column === 'caseType') return caseTypeLabel(errand).toLowerCase();
    if (column === 'status') return (errand.externalStatus ?? errand.status ?? '').toLowerCase();
    return errand[column] ?? '';
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === SortMode.ASC ? SortMode.DESC : SortMode.ASC);
    } else {
      setSortColumn(column);
      setSortOrder(SortMode.ASC);
    }
    setPage(0);
  };

  const filtered = (errands ?? [])
    .filter((errand) => relationFilter === 'all' || !!relationFor(errand))
    .filter((errand) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [errand.errandNumber, caseTypeLabel(errand), errand.externalStatus, errand.status]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const aValue = sortValue(a, sortColumn);
      const bValue = sortValue(b, sortColumn);
      const order = aValue.localeCompare(bValue);
      return sortOrder === SortMode.ASC ? order : -order;
    });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const headers: { label: string; column: SortColumn }[] = [
    { label: 'Status', column: 'status' },
    { label: 'Ärendetyp', column: 'caseType' },
    { label: 'Registrerades', column: 'firstSubmitted' },
    { label: 'Senaste aktivitet', column: 'lastStatusChange' },
  ];

  if (errands === undefined) {
    return (
      <div className="flex justify-center items-center py-40">
        <Spinner aria-label="Hämtar ärenden" />
      </div>
    );
  }

  return (
    <div className="py-24" data-cy="customer-view-errands">
      <div className="flex flex-wrap items-end gap-16">
        {sourceErrandId ? (
          <div>
            <p className="text-label-small">Visa</p>
            <Select
              value={relationFilter}
              onChange={(e) => {
                setRelationFilter(e.currentTarget.value as 'all' | 'related');
                setPage(0);
              }}
              data-cy="customer-view-errands-relation-filter"
            >
              <Select.Option value="all">Alla ärenden</Select.Option>
              <Select.Option value="related">Relaterade</Select.Option>
            </Select>
          </div>
        ) : null}
        <div className="flex-1 min-w-[24rem] max-w-[52rem]">
          <p className="text-label-small">Sök i listan</p>
          <SearchField
            className="w-full"
            placeholder="Sök på ärendetyp, status eller ärendenummer"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            onReset={() => {
              setQuery('');
              setPage(0);
            }}
            showSearchButton={false}
            data-cy="customer-view-errands-search"
          />
        </div>
      </div>
      {error ? (
        <p className="text-error mt-24" role="alert">
          Ärenden kunde inte hämtas
        </p>
      ) : (
        <>
          <p className="mt-24 mb-8 text-small" data-cy="customer-view-errands-count">
            Visar {paged.length} av {filtered.length} ärenden
          </p>
          {filtered.length > 0 ? (
            <Table background data-cy="customer-view-errands-table">
              <Table.Header>
                {headers.map((header) => (
                  <Table.HeaderColumn key={header.column}>
                    <Table.SortButton
                      isActive={sortColumn === header.column}
                      sortOrder={sortOrder}
                      onClick={() => handleSort(header.column)}
                    >
                      {header.label}
                    </Table.SortButton>
                  </Table.HeaderColumn>
                ))}
                {sourceErrandId ? (
                  <Table.HeaderColumn>
                    <span className="sr-only">Relatera</span>
                  </Table.HeaderColumn>
                ) : null}
              </Table.Header>
              <Table.Body>
                {paged.map((errand) => {
                  const linked = !!relationFor(errand);
                  const statusText = errand.externalStatus ?? errand.status ?? '';
                  return (
                    <Table.Row key={errand.caseId}>
                      <Table.HeaderColumn scope="row" className="w-[14rem] overflow-hidden">
                        <span title={statusText}>
                          <CaseStatusLabelComponent externalStatus={statusText} />
                        </span>
                      </Table.HeaderColumn>
                      <Table.Column className="w-[20rem]">
                        <div
                          className="whitespace-nowrap overflow-hidden text-ellipsis table-caption font-bold hover:whitespace-normal hover:break-words"
                          title={caseTypeLabel(errand)}
                        >
                          {caseTypeLabel(errand)}
                        </div>
                      </Table.Column>
                      <Table.Column className="w-[16rem] whitespace-nowrap">
                        {formatDate(errand.firstSubmitted)}
                      </Table.Column>
                      <Table.Column className="w-[16rem] whitespace-nowrap">
                        {formatDate(errand.lastStatusChange)}
                      </Table.Column>
                      {sourceErrandId ? (
                        <Table.Column className="justify-end">
                          {linked ? (
                            <div className="flex items-center gap-8">
                              {onOpenMessage ? (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  color="vattjom"
                                  data-cy={`customer-view-message-${errand.caseId}`}
                                  onClick={() => onOpenMessage(errand)}
                                >
                                  Skicka meddelande
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="secondary"
                                iconButton
                                aria-label="Ta bort relation"
                                title="Ta bort relation"
                                disabled={busyCaseId === errand.caseId}
                                data-cy={`customer-view-unrelate-${errand.caseId}`}
                                onClick={() => handleUnrelate(errand)}
                              >
                                <Icon icon={<Link2Off size={16} />} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyCaseId === errand.caseId}
                              data-cy={`customer-view-relate-${errand.caseId}`}
                              leftIcon={<Icon icon={<Link2 size={16} />} />}
                              onClick={() => handleRelate(errand)}
                            >
                              Relatera
                            </Button>
                          )}
                        </Table.Column>
                      ) : null}
                    </Table.Row>
                  );
                })}
              </Table.Body>
              {totalPages > 1 ? (
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
                      activePage={safePage + 1}
                      changePage={(newPage) => setPage(newPage - 1)}
                      data-cy="customer-view-errands-pagination"
                    />
                  </div>
                </Table.Footer>
              ) : null}
            </Table>
          ) : (
            <p data-cy="customer-view-errands-empty">Inga ärenden hittades</p>
          )}
        </>
      )}
    </div>
  );
};
