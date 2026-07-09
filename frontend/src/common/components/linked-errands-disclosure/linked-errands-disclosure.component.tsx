import { IErrand } from '@casedata/interfaces/errand';
import { RelationErrandCard } from '@common/components/linked-errands-disclosure/relation-errand-card.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import {
  isValidOrgNumber,
  isValidPersonalNumber,
  searchOrganization,
  searchPerson,
} from '@common/services/adress-service';
import {
  CaseStatusResponse,
  getErrandStatus,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
} from '@common/services/casestatus-service';
import { createRelation, deleteRelation, getResolvedRelations } from '@common/services/relations-service';
import { appConfig } from '@config/appconfig';
import { Disclosure, Pagination, SearchField, Select, Spinner, useConfirm } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import {
  getSupportErrands,
  SupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { Link2 } from 'lucide-react';
import { FC, ReactNode, useEffect, useState } from 'react';

const RESULT_PAGE_SIZE = 20;
const SUPPORT_SEARCH_SIZE = 10;
type StatusFilter = 'all' | 'ongoing' | 'closed';

const isClosed = (errand: CaseStatusResponse) => errand.status === 'Klart' || errand.externalStatus === 'Avslutat';

const matchesStatusFilter = (errand: CaseStatusResponse, statusFilter: StatusFilter) => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'closed') return isClosed(errand);
  return !isClosed(errand);
};

const uniqueByCaseId = (errands: CaseStatusResponse[]) => {
  const seen = new Set<string>();
  return errands.filter((errand) => {
    if (!errand.caseId || seen.has(errand.caseId)) return false;
    seen.add(errand.caseId);
    return true;
  });
};

const getSupportStatusHits = async (
  municipalityId: string,
  query: string,
  statusHits: CaseStatusResponse[]
): Promise<CaseStatusResponse[]> => {
  if (!appConfig.isSupportManagement) return [];

  const supportErrands = await getSupportErrands(municipalityId, 0, SUPPORT_SEARCH_SIZE, { query }).catch(() => ({
    errands: [] as SupportErrand[],
    labels: [],
  }));
  const alreadyFound = new Set(statusHits.map((status) => status.errandNumber));
  const lookups = await Promise.allSettled(
    supportErrands.errands
      .filter((errand) => errand.errandNumber && !alreadyFound.has(errand.errandNumber))
      .map((errand) => getErrandStatus(municipalityId, errand.errandNumber!))
  );
  return lookups.flatMap((res) => (res.status === 'fulfilled' ? res.value : []));
};

const resolveSearchResults = async (municipalityId: string, query: string) => {
  if (isValidPersonalNumber(query)) {
    const person = await searchPerson(query).catch(() => undefined);
    return person?.personId ? getStatusesUsingPartyId(municipalityId, person.personId) : [];
  }

  if (isValidOrgNumber(query)) {
    const organization = await searchOrganization(query).catch(() => undefined);
    return organization ? getStatusesUsingOrganizationNumber(municipalityId, query).catch(() => []) : [];
  }

  const statusHits: CaseStatusResponse[] = await getErrandStatus(municipalityId, query).catch(() => []);
  const supportHits = await getSupportStatusHits(municipalityId, query, statusHits);
  return uniqueByCaseId([...statusHits, ...supportHits]);
};

const LoadingBlock: FC = () => (
  <div className="flex justify-center items-center h-[5rem]">
    <Spinner />
  </div>
);

const RelationListContent: FC<{
  loading: boolean;
  errands: CaseStatusResponse[];
  listDataCy: string;
  emptyDataCy: string;
  emptyMessage: string;
  children: (errand: CaseStatusResponse) => ReactNode;
}> = ({ loading, errands, listDataCy, emptyDataCy, emptyMessage, children }) => {
  if (loading) return <LoadingBlock />;

  if (errands.length === 0) {
    return (
      <p className="text-dark-secondary" data-cy={emptyDataCy}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-12" data-cy={listDataCy}>
      {errands.map((errand) => children(errand))}
    </div>
  );
};

const SearchResultsContent: FC<{
  searching: boolean;
  hasSearched: boolean;
  hasResults: boolean;
  children: ReactNode;
}> = ({ searching, hasSearched, hasResults, children }) => {
  if (searching) return <LoadingBlock />;
  if (!hasSearched) return null;

  if (!hasResults) {
    return <p data-cy="linked-errands-search-empty">Inga ärenden hittades för sökningen.</p>;
  }

  return <>{children}</>;
};

export const LinkedErrandsDisclosure: FC<{
  errand: SupportErrand | IErrand;
}> = ({ errand }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const [isLoadingRelations, setIsLoadingRelations] = useState<boolean>(false);
  const [isLoadingFromErrands, setIsLoadingFromErrands] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [searchedErrands, setSearchedErrands] = useState<CaseStatusResponse[]>([]);
  const [relationFromErrands, setRelationFromErrands] = useState<CaseStatusResponse[]>([]);
  const [resolvedSourceStatuses, setResolvedSourceStatuses] = useState<CaseStatusResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resultPage, setResultPage] = useState(0);
  const removeRelationConfirm = useConfirm();

  const sortOrder = 'ASC';
  const errandId = errand.id?.toString();

  const refreshSourceRelations = async () => {
    const { relations: updatedRelations, caseStatuses } = await getResolvedRelations(
      'source',
      municipalityId,
      errandId!,
      sortOrder
    );
    setRelations(updatedRelations);
    setResolvedSourceStatuses(caseStatuses);
  };

  const isLinked = (e: CaseStatusResponse) => relations.some((relation) => relation.target.resourceId === e.caseId);

  const handleToggleLink = (targetErrand: CaseStatusResponse) => {
    const relation = relations.find((r) => r.target.resourceId === targetErrand.caseId);
    if (relation?.id) {
      removeRelationConfirm
        .showConfirmation(
          'Ta bort relation?',
          `Relationen till ärende ${targetErrand.errandNumber ?? ''} kommer att tas bort. Vill du fortsätta?`,
          'Ja',
          'Nej',
          'info',
          'info'
        )
        .then((confirmed) => {
          if (!confirmed) return;
          deleteRelation(municipalityId, relation.id!)
            .then(() => refreshSourceRelations())
            .catch((e) => console.error('Failed to delete relation:', e));
        });
    } else {
      createRelation(municipalityId, errandId!, targetErrand)
        .then(() => refreshSourceRelations())
        .catch((e) => console.error('Failed to create relation:', e));
    }
  };

  const openMessageFor = (targetErrand: CaseStatusResponse) => {
    window.dispatchEvent(
      new CustomEvent('openMessage', {
        detail: { contactMeans: 'draken', relationCaseId: targetErrand.caseId },
      })
    );
  };

  // Sökningen kräver en specifik identifierare innan träffar visas. Personnummer och
  // organisationsnummer slås upp till partyId och ger personens/organisationens alla ärenden.
  // Övriga söktermer går mot casestatus (ärendenummer/fastighet) och, i supportmanagement,
  // mot ärendesöket (telefon, e-post, namn) vars träffar kanoniseras via casestatus per
  // ärendenummer så att status, namespace och ärendetyp alltid kommer från samma källa.
  const performSearch = async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) return;
    setSearching(true);
    try {
      const results = await resolveSearchResults(municipalityId, trimmed);
      setSearchedErrands(results.filter((e) => e.caseId !== errandId));
      setHasSearched(true);
      setStatusFilter('all');
      setResultPage(0);
    } finally {
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setQuery('');
    setSearchedErrands([]);
    setHasSearched(false);
    setResultPage(0);
  };

  useEffect(() => {
    const fetchRelations = async () => {
      try {
        setIsLoadingRelations(true);
        await refreshSourceRelations();
      } catch (error) {
        console.error('Error fetching relations:', error);
      } finally {
        setIsLoadingRelations(false);
      }
    };

    fetchRelations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  useEffect(() => {
    const fetchErrands = async () => {
      try {
        setIsLoadingFromErrands(true);
        const { caseStatuses } = await getResolvedRelations('target', municipalityId, errandId!, sortOrder);
        setRelationFromErrands(caseStatuses);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
      } finally {
        setIsLoadingFromErrands(false);
      }
    };

    fetchErrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const filteredResults = searchedErrands.filter((e) => matchesStatusFilter(e, statusFilter));
  const totalResultPages = Math.ceil(filteredResults.length / RESULT_PAGE_SIZE);
  const safeResultPage = Math.min(resultPage, Math.max(totalResultPages - 1, 0));
  const pagedResults = filteredResults.slice(
    safeResultPage * RESULT_PAGE_SIZE,
    (safeResultPage + 1) * RESULT_PAGE_SIZE
  );
  const disclosureDisabled = appConfig.isSupportManagement && supportErrandIsEmpty(errand as SupportErrand);
  const messageHandlerFor = (targetErrand: CaseStatusResponse) => {
    if (!appConfig.isSupportManagement) return undefined;
    return () => openMessageFor(targetErrand);
  };
  const linkedMessageHandlerFor = (targetErrand: CaseStatusResponse) => {
    if (!isLinked(targetErrand)) return undefined;
    return messageHandlerFor(targetErrand);
  };

  return (
    <Disclosure disabled={disclosureDisabled} variant="alt" data-cy={`connected-errands-disclosure`}>
      <Disclosure.Header>
        <Disclosure.Icon icon={<Link2 />} />
        <Disclosure.Title>Kopplade ärenden</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <Disclosure variant="alt" initalOpen data-cy="relations-overview-disclosure">
          <Disclosure.Header>
            <Disclosure.Title>Relationer skapade från detta ärende</Disclosure.Title>
            <Disclosure.Button />
          </Disclosure.Header>
          <Disclosure.Content>
            <p className="mb-[1.2rem]">Här visas alla ärenden som detta ärende har kopplats till.</p>
            <RelationListContent
              loading={isLoadingRelations}
              errands={resolvedSourceStatuses}
              listDataCy="relations-overview-list"
              emptyDataCy="relations-overview-empty"
              emptyMessage="Inga relationer har skapats från detta ärende."
            >
              {(relatedErrand) => (
                <RelationErrandCard
                  key={relatedErrand.caseId}
                  errand={relatedErrand}
                  linked
                  onToggleLink={() => handleToggleLink(relatedErrand)}
                  onOpenMessage={messageHandlerFor(relatedErrand)}
                />
              )}
            </RelationListContent>
          </Disclosure.Content>
        </Disclosure>

        <div className="mt-16">
          <Disclosure variant="alt" initalOpen data-cy="link-errands-disclosure">
            <Disclosure.Header>
              <Disclosure.Title>Koppla ärenden</Disclosure.Title>
              <Disclosure.Button />
            </Disclosure.Header>
            <Disclosure.Content>
              <p className="mb-[2.4rem]">
                Sök på ärendenummer, personnummer, organisationsnummer, telefonnummer, e-postadress eller
                fastighetsbeteckning för att hitta ärenden att koppla.
              </p>
              <p className="text-label-small">Sök ärende</p>
              <SearchField
                size="md"
                className="w-[52rem] max-w-full mb-[2.4rem]"
                placeholder="Sök på t.ex. ärendenummer eller personnummer"
                value={query}
                onSearch={(e) => performSearch(e)}
                onReset={() => resetSearch()}
                searchLabel={searching ? 'Söker' : 'Sök'}
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                data-cy="linked-errands-search"
              />

              <SearchResultsContent
                searching={searching}
                hasSearched={hasSearched}
                hasResults={searchedErrands.length > 0}
              >
                <>
                  <div className="flex flex-wrap items-end justify-between gap-16">
                    <div>
                      <p className="text-label-small">Visa</p>
                      <Select
                        size="md"
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.currentTarget.value as StatusFilter);
                          setResultPage(0);
                        }}
                        data-cy="linked-errands-status-filter"
                      >
                        <Select.Option value="all">Alla</Select.Option>
                        <Select.Option value="ongoing">Pågående</Select.Option>
                        <Select.Option value="closed">Avslutade</Select.Option>
                      </Select>
                    </div>
                    <p className="mb-8 text-small" data-cy="linked-errands-search-count">
                      Visar {pagedResults.length} av {filteredResults.length} träffar
                    </p>
                  </div>
                  <div className="flex flex-col gap-12 mt-16" data-cy="searchresults-list">
                    {pagedResults.map((foundErrand) => (
                      <RelationErrandCard
                        key={foundErrand.caseId}
                        errand={foundErrand}
                        linked={isLinked(foundErrand)}
                        onToggleLink={() => handleToggleLink(foundErrand)}
                        onOpenMessage={linkedMessageHandlerFor(foundErrand)}
                      />
                    ))}
                  </div>
                  {totalResultPages > 1 ? (
                    <div className="sk-table-paginationwrapper mt-16">
                      <Pagination
                        showFirst
                        showLast
                        pagesBefore={1}
                        pagesAfter={1}
                        showConstantPages={true}
                        fitContainer
                        pages={totalResultPages}
                        activePage={safeResultPage + 1}
                        changePage={(newPage) => setResultPage(newPage - 1)}
                        data-cy="linked-errands-search-pagination"
                      />
                    </div>
                  ) : null}
                </>
              </SearchResultsContent>
            </Disclosure.Content>
          </Disclosure>
        </div>

        <div className="mt-16">
          <Disclosure variant="alt" initalOpen data-cy="relations-from-disclosure">
            <Disclosure.Header>
              <Disclosure.Title>Kopplingar skapade till detta ärende</Disclosure.Title>
              <Disclosure.Button />
            </Disclosure.Header>
            <Disclosure.Content>
              <p className="mb-[1.2rem]">Här visas ärenden som andra ärenden har kopplat till detta ärende.</p>
              <RelationListContent
                loading={isLoadingFromErrands}
                errands={relationFromErrands}
                listDataCy="relations-from-list"
                emptyDataCy="relations-from-empty"
                emptyMessage="Inga andra ärenden har kopplats till detta ärende."
              >
                {(fromErrand) => <RelationErrandCard key={fromErrand.caseId} errand={fromErrand} />}
              </RelationListContent>
            </Disclosure.Content>
          </Disclosure>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};
