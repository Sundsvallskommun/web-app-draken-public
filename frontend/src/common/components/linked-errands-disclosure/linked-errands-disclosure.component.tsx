import { IErrand } from '@casedata/interfaces/errand';
import { getOwnerStakeholder } from '@casedata/services/casedata-stakeholder-service';
import { RelationErrandCard } from '@common/components/linked-errands-disclosure/relation-errand-card.component';
import { Relation } from '@common/data-contracts/relations/data-contracts';
import { isValidOrgNumber, isValidPersonalNumber, searchPerson } from '@common/services/adress-service';
import {
  CaseStatusResponse,
  getErrandStatus,
  getStatusesUsingOrganizationNumber,
  getStatusesUsingPartyId,
  isClosedCaseStatus,
} from '@common/services/casestatus-service';
import { dispatchOpenMessage } from '@common/services/message-event-service';
import { createRelation, deleteRelation, getResolvedRelations } from '@common/services/relations-service';
import { appConfig } from '@config/appconfig';
import { Disclosure, Pagination, SearchField, Select, Spinner, useConfirm, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import {
  ExternalIdType,
  getSupportErrands,
  SupportErrand,
  supportErrandIsEmpty,
} from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { Link2 } from 'lucide-react';
import { FC, ReactNode, useEffect, useState } from 'react';

const RESULT_PAGE_SIZE = 20;
const SUPPORT_SEARCH_SIZE = 10;
type StatusFilter = 'all' | 'ongoing' | 'closed';

interface SearchOutcome {
  errands: CaseStatusResponse[];
  // Antal supportträffar som sökningen hittade men inte visar, så att UI:t kan säga det rakt ut
  // i stället för att låta listan se uttömmande ut.
  omittedCount: number;
}

const matchesStatusFilter = (errand: CaseStatusResponse, statusFilter: StatusFilter) => {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'closed') return isClosedCaseStatus(errand);
  return !isClosedCaseStatus(errand);
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
): Promise<SearchOutcome> => {
  if (!appConfig.isSupportManagement) return { errands: [], omittedCount: 0 };

  const supportErrands = await getSupportErrands(municipalityId, 0, SUPPORT_SEARCH_SIZE, { query }).catch(() => null);
  if (!supportErrands) return { errands: [], omittedCount: 0 };

  const alreadyFound = new Set(statusHits.map((status) => status.errandNumber));
  const lookups = await Promise.allSettled(
    supportErrands.errands
      .filter((errand) => errand.errandNumber && !alreadyFound.has(errand.errandNumber))
      .map((errand) => getErrandStatus(municipalityId, errand.errandNumber!))
  );
  return {
    errands: lookups.flatMap((res) => (res.status === 'fulfilled' ? res.value : [])),
    omittedCount: Math.max((supportErrands.totalElements ?? 0) - supportErrands.errands.length, 0),
  };
};

const resolveSearchResults = async (municipalityId: string, query: string): Promise<SearchOutcome> => {
  if (isValidPersonalNumber(query)) {
    const person = await searchPerson(query).catch(() => undefined);
    if (!person?.personId) return { errands: [], omittedCount: 0 };
    const errands = await getStatusesUsingPartyId(municipalityId, person.personId);
    return { errands, omittedCount: 0 };
  }

  if (isValidOrgNumber(query)) {
    const errands = await getStatusesUsingOrganizationNumber(municipalityId, query);
    return { errands, omittedCount: 0 };
  }

  const statusHits: CaseStatusResponse[] = await getErrandStatus(municipalityId, query).catch(() => []);
  const supportHits = await getSupportStatusHits(municipalityId, query, statusHits);
  return { errands: uniqueByCaseId([...statusHits, ...supportHits.errands]), omittedCount: supportHits.omittedCount };
};

// Ärendeägarens övriga ärenden listas utan sökning när useStakeholderRelations är på. Ägaren
// slås upp olika i de två domänerna, men båda landar i samma casestatus-uppslag.
const getOwnerErrands = async (
  municipalityId: string,
  errand: SupportErrand | IErrand
): Promise<CaseStatusResponse[]> => {
  if (appConfig.isSupportManagement) {
    const stakeholder = getSupportOwnerStakeholder(errand as SupportErrand);
    if (!stakeholder) return [];
    // Organisationer slås upp på organisationsnummer, personer på partyId — samma uppdelning
    // som kundbildsfoten gör, så att båda vyerna visar samma ärenden för samma ägare.
    if (stakeholder.externalIdType === ExternalIdType.COMPANY && stakeholder.organizationNumber) {
      return getStatusesUsingOrganizationNumber(municipalityId, stakeholder.organizationNumber);
    }
    return stakeholder.externalId ? getStatusesUsingPartyId(municipalityId, stakeholder.externalId) : [];
  }

  const stakeholder = getOwnerStakeholder(errand as IErrand);
  if (!stakeholder) return [];
  if (stakeholder.stakeholderType === 'ORGANIZATION') {
    return stakeholder.organizationNumber
      ? getStatusesUsingOrganizationNumber(municipalityId, stakeholder.organizationNumber)
      : [];
  }
  return stakeholder.personId ? getStatusesUsingPartyId(municipalityId, stakeholder.personId) : [];
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

export const LinkedErrandsDisclosure: FC<{
  errand: SupportErrand | IErrand;
}> = ({ errand }) => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const toastMessage = useSnackbar();
  const [isLoadingRelations, setIsLoadingRelations] = useState<boolean>(false);
  const [isLoadingFromErrands, setIsLoadingFromErrands] = useState<boolean>(false);
  const [isLoadingOwnerErrands, setIsLoadingOwnerErrands] = useState<boolean>(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [omittedSearchHits, setOmittedSearchHits] = useState(0);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [searchedErrands, setSearchedErrands] = useState<CaseStatusResponse[]>([]);
  const [ownerErrands, setOwnerErrands] = useState<CaseStatusResponse[]>([]);
  const [relationFromErrands, setRelationFromErrands] = useState<CaseStatusResponse[]>([]);
  const [resolvedSourceStatuses, setResolvedSourceStatuses] = useState<CaseStatusResponse[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [resultPage, setResultPage] = useState(0);
  const removeRelationConfirm = useConfirm();

  const sortOrder = 'ASC';
  const errandId = errand.id?.toString();
  const showOwnerErrands = appConfig.features.useStakeholderRelations;

  const notifyError = (message: string) =>
    toastMessage({ position: 'bottom', closeable: false, message, status: 'error' });

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
            .catch(() => notifyError('Relationen kunde inte tas bort'));
        });
    } else {
      createRelation(municipalityId, errandId!, targetErrand)
        .then(() => refreshSourceRelations())
        .catch(() => notifyError('Ärendena kunde inte kopplas'));
    }
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
      const { errands: results, omittedCount } = await resolveSearchResults(municipalityId, trimmed);
      setSearchedErrands(results.filter((e) => e.caseId !== errandId));
      setOmittedSearchHits(omittedCount);
      setSearchError(false);
    } catch (error) {
      console.error('Error searching for errands to link:', error);
      setSearchedErrands([]);
      setOmittedSearchHits(0);
      setSearchError(true);
    } finally {
      setHasSearched(true);
      setStatusFilter('all');
      setResultPage(0);
      setSearching(false);
    }
  };

  const resetSearch = () => {
    setQuery('');
    setSearchedErrands([]);
    setHasSearched(false);
    setSearchError(false);
    setOmittedSearchHits(0);
    setStatusFilter('all');
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

  useEffect(() => {
    if (!showOwnerErrands) return;

    let active = true;
    setIsLoadingOwnerErrands(true);
    getOwnerErrands(municipalityId, errand)
      .then((errands) => {
        if (active) setOwnerErrands(errands.filter((e) => e.caseId !== errandId));
      })
      .catch((error) => {
        console.error('Error fetching errands for the errand owner:', error);
        if (active) setOwnerErrands([]);
      })
      .finally(() => {
        if (active) setIsLoadingOwnerErrands(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errand, showOwnerErrands]);

  // Utan sökning visas ärendeägarens ärenden; en sökning ersätter listan tills den nollställs.
  const listedErrands = hasSearched ? searchedErrands : ownerErrands;
  const listIsLoading = hasSearched ? searching : isLoadingOwnerErrands;
  const filteredResults = listedErrands.filter((e) => matchesStatusFilter(e, statusFilter));
  const totalResultPages = Math.ceil(filteredResults.length / RESULT_PAGE_SIZE);
  const safeResultPage = Math.min(resultPage, Math.max(totalResultPages - 1, 0));
  const pagedResults = filteredResults.slice(
    safeResultPage * RESULT_PAGE_SIZE,
    (safeResultPage + 1) * RESULT_PAGE_SIZE
  );
  const disclosureDisabled = appConfig.isSupportManagement && supportErrandIsEmpty(errand as SupportErrand);
  const messageHandlerFor = (targetErrand: CaseStatusResponse) => {
    if (!appConfig.isSupportManagement) return undefined;
    return () => dispatchOpenMessage({ contactMeans: 'draken', relationCaseId: targetErrand.caseId });
  };
  const linkedMessageHandlerFor = (targetErrand: CaseStatusResponse) => {
    if (!isLinked(targetErrand)) return undefined;
    return messageHandlerFor(targetErrand);
  };

  const renderListBody = () => {
    if (listIsLoading) return <LoadingBlock />;

    if (searchError) {
      return (
        <p className="text-error" role="alert" data-cy="linked-errands-search-error">
          Sökningen kunde inte genomföras. Försök igen.
        </p>
      );
    }

    if (filteredResults.length === 0) {
      return hasSearched ? (
        <p data-cy="linked-errands-search-empty">Inga ärenden hittades för sökningen.</p>
      ) : (
        <p data-cy="linked-errands-owner-empty">
          {showOwnerErrands
            ? 'Ärendeägaren har inga andra ärenden. Sök ovan för att koppla ett annat ärende.'
            : 'Sök ovan för att hitta ärenden att koppla.'}
        </p>
      );
    }

    return (
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
            Visar {pagedResults.length} av {filteredResults.length} {hasSearched ? 'träffar' : 'ärenden'}
          </p>
        </div>
        {omittedSearchHits > 0 ? (
          <p className="mt-8 text-small text-dark-secondary" data-cy="linked-errands-search-truncated">
            Sökningen visar högst {SUPPORT_SEARCH_SIZE} ärenden från supporthanteringen. Ytterligare {omittedSearchHits}{' '}
            matchande ärenden visas inte — förfina sökningen för att se dem.
          </p>
        ) : null}
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
    );
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
                {showOwnerErrands
                  ? 'Nedan visas ärendeägarens övriga ärenden. Sök på ärendenummer, personnummer, organisationsnummer, telefonnummer, e-postadress eller fastighetsbeteckning för att hitta andra ärenden att koppla.'
                  : 'Sök på ärendenummer, personnummer, organisationsnummer, telefonnummer, e-postadress eller fastighetsbeteckning för att hitta ärenden att koppla.'}
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

              {renderListBody()}
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
