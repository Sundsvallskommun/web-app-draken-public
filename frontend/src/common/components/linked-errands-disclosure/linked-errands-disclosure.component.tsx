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
import { FC, useEffect, useState } from 'react';

const RESULT_PAGE_SIZE = 20;
const SUPPORT_SEARCH_SIZE = 10;

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'ongoing' | 'closed'>('all');
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
      let results: CaseStatusResponse[] = [];
      if (isValidPersonalNumber(trimmed)) {
        const person = await searchPerson(trimmed).catch(() => undefined);
        results = person?.personId ? await getStatusesUsingPartyId(municipalityId, person.personId) : [];
      } else if (isValidOrgNumber(trimmed)) {
        const organization = await searchOrganization(trimmed).catch(() => undefined);
        results = organization ? await getStatusesUsingOrganizationNumber(municipalityId, trimmed).catch(() => []) : [];
      } else {
        const statusHits: CaseStatusResponse[] = await getErrandStatus(municipalityId, trimmed).catch(() => []);
        let supportHits: CaseStatusResponse[] = [];
        if (appConfig.isSupportManagement) {
          const supportErrands = await getSupportErrands(municipalityId, 0, SUPPORT_SEARCH_SIZE, {
            query: trimmed,
          }).catch(() => ({ errands: [] as SupportErrand[], labels: [] }));
          const alreadyFound = new Set(statusHits.map((s) => s.errandNumber));
          const lookups = await Promise.allSettled(
            supportErrands.errands
              .filter((e) => e.errandNumber && !alreadyFound.has(e.errandNumber))
              .map((e) => getErrandStatus(municipalityId, e.errandNumber!))
          );
          supportHits = lookups.flatMap((res) => (res.status === 'fulfilled' ? res.value : []));
        }
        const seen = new Set<string>();
        results = [...statusHits, ...supportHits].filter((e) => {
          if (!e.caseId || seen.has(e.caseId)) return false;
          seen.add(e.caseId);
          return true;
        });
      }
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
        setIsLoadingFromErrands(false);
      } catch (error) {
        console.error('Error fetching errands or relations:', error);
        setIsLoadingFromErrands(false);
      }
    };

    fetchErrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand]);

  const isClosed = (e: CaseStatusResponse) => e.status === 'Klart' || e.externalStatus === 'Avslutat';
  const filteredResults = searchedErrands.filter((e) =>
    statusFilter === 'all' ? true : statusFilter === 'closed' ? isClosed(e) : !isClosed(e)
  );
  const totalResultPages = Math.ceil(filteredResults.length / RESULT_PAGE_SIZE);
  const safeResultPage = Math.min(resultPage, Math.max(totalResultPages - 1, 0));
  const pagedResults = filteredResults.slice(
    safeResultPage * RESULT_PAGE_SIZE,
    (safeResultPage + 1) * RESULT_PAGE_SIZE
  );

  return (
    <Disclosure
      disabled={appConfig.isSupportManagement ? supportErrandIsEmpty(errand as SupportErrand) : false}
      variant="alt"
      data-cy={`connected-errands-disclosure`}
    >
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
            {isLoadingRelations ? (
              <div className="flex justify-center items-center h-[5rem]">
                <Spinner />
              </div>
            ) : resolvedSourceStatuses.length > 0 ? (
              <div className="flex flex-col gap-12" data-cy="relations-overview-list">
                {resolvedSourceStatuses.map((relatedErrand) => (
                  <RelationErrandCard
                    key={relatedErrand.caseId}
                    errand={relatedErrand}
                    linked
                    onToggleLink={() => handleToggleLink(relatedErrand)}
                    onOpenMessage={appConfig.isSupportManagement ? () => openMessageFor(relatedErrand) : undefined}
                  />
                ))}
              </div>
            ) : (
              <p className="text-dark-secondary" data-cy="relations-overview-empty">
                Inga relationer har skapats från detta ärende.
              </p>
            )}
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

              {searching ? (
                <div className="flex justify-center items-center h-[5rem]">
                  <Spinner />
                </div>
              ) : hasSearched ? (
                searchedErrands.length > 0 ? (
                  <>
                    <div className="flex flex-wrap items-end justify-between gap-16">
                      <div>
                        <p className="text-label-small">Visa</p>
                        <Select
                          size="md"
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.currentTarget.value as 'all' | 'ongoing' | 'closed');
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
                          onOpenMessage={
                            appConfig.isSupportManagement && isLinked(foundErrand)
                              ? () => openMessageFor(foundErrand)
                              : undefined
                          }
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
                ) : (
                  <p data-cy="linked-errands-search-empty">Inga ärenden hittades för sökningen.</p>
                )
              ) : null}
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
              {isLoadingFromErrands ? (
                <div className="flex justify-center items-center h-[5rem]">
                  <Spinner />
                </div>
              ) : relationFromErrands.length > 0 ? (
                <div className="flex flex-col gap-12" data-cy="relations-from-list">
                  {relationFromErrands.map((fromErrand) => (
                    <RelationErrandCard key={fromErrand.caseId} errand={fromErrand} />
                  ))}
                </div>
              ) : (
                <p className="text-dark-secondary" data-cy="relations-from-empty">
                  Inga andra ärenden har kopplats till detta ärende.
                </p>
              )}
            </Disclosure.Content>
          </Disclosure>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};
