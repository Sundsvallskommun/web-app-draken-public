'use client';

import { CaseLabels } from '@casedata/interfaces/case-label';
import { RelationErrandCard } from '@common/components/linked-errands-disclosure/relation-errand-card.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import {
  CaseStatusResponse,
  findOperationUsingNamespace,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { createRelation, deleteRelation, getResolvedRelations } from '@common/services/relations-service';
import { Pagination, SearchField, Select, Spinner, useConfirm } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import { FC, useEffect, useState } from 'react';

interface CustomerViewErrandsProps {
  partyId: string;
  organizationNumber?: string;
  sourceErrandId?: string;
  onOpenMessage?: (errand: CaseStatusResponse) => void;
}

const caseTypeLabel = (errand: CaseStatusResponse) =>
  (CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType ?? '';

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
  const [busyCaseId, setBusyCaseId] = useState<string>();
  const [page, setPage] = useState(0);
  const [relationFilter, setRelationFilter] = useState<'all' | 'related'>('all');
  const removeRelationConfirm = useConfirm();

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
    removeRelationConfirm
      .showConfirmation(
        'Ta bort relation?',
        `Relationen till ärende ${errand.errandNumber ?? ''} kommer att tas bort. Vill du fortsätta?`,
        'Ja',
        'Nej',
        'info',
        'info'
      )
      .then((confirmed) => {
        if (!confirmed) return;
        setBusyCaseId(errand.caseId);
        deleteRelation(municipalityId, relation.id!)
          .then(() => refreshRelations())
          .catch((e) => console.error('Failed to delete relation:', e))
          .finally(() => setBusyCaseId(undefined));
      });
  };

  const filtered = (errands ?? [])
    .filter((errand) => relationFilter === 'all' || !!relationFor(errand))
    .filter((errand) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return [
        errand.errandNumber,
        caseTypeLabel(errand),
        errand.externalStatus,
        errand.status,
        findOperationUsingNamespace(errand.namespace ?? ''),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    })
    .sort((a, b) => (b.lastStatusChange ?? '').localeCompare(a.lastStatusChange ?? ''));

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(totalPages - 1, 0));
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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
              size="md"
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
            size="md"
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
            <>
              <div className="flex flex-col gap-12" data-cy="customer-view-errands-list">
                {paged.map((errand) => {
                  const linked = !!relationFor(errand);
                  return (
                    <RelationErrandCard
                      key={errand.caseId}
                      errand={errand}
                      linked={linked}
                      actionsDisabled={busyCaseId === errand.caseId}
                      onToggleLink={
                        sourceErrandId ? () => (linked ? handleUnrelate(errand) : handleRelate(errand)) : undefined
                      }
                      onOpenMessage={linked && onOpenMessage ? () => onOpenMessage(errand) : undefined}
                    />
                  );
                })}
              </div>
              {totalPages > 1 ? (
                <div className="sk-table-paginationwrapper mt-16">
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
              ) : null}
            </>
          ) : (
            <p data-cy="customer-view-errands-empty">Inga ärenden hittades</p>
          )}
        </>
      )}
    </div>
  );
};
