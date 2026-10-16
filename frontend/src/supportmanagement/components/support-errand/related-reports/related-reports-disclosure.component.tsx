import {
  BaseRelationsTable,
  RelationErrandCells,
  relationTableHeaders,
} from '@common/components/linked-errands-disclosure/relation-tables/base-relation-table.component';
import { type CaseStatusResponse, getStatusesUsingPartyId } from '@common/services/casestatus-service';
import { Disclosure, Spinner } from '@sk-web-gui/react';
import { useConfigStore } from '@stores/index';
import type { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { getSupportOwnerStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { Link2 } from 'lucide-react';
import { FC, useEffect, useState } from 'react';

import { brukarePartyId, otherReports } from './related-reports';

const headers = relationTableHeaders([
  { label: 'Status', screenReaderOnly: false, sortable: false },
  { label: 'Ärendetyp', screenReaderOnly: false, sortable: false },
  { label: 'Ärendenummer', screenReaderOnly: false, sortable: false },
]);

/**
 * Relaterade rapporter: the other reports on the person the report concerns, the brukare, so the handler sees that
 * there are more of them. Read-only - nothing is searched, and no relation is made or broken. The reports are the
 * drake's own, which the BFF sees to.
 */
export const RelatedReportsDisclosure: FC<{
  errand: SupportErrand;
  /** Closed for an errand that is not yet registered, as Kopplade ärenden is. */
  disabled: boolean;
}> = ({ errand, disabled }) => {
  const municipalityId = useConfigStore((state) => state.municipalityId);
  const partyId = brukarePartyId(getSupportOwnerStakeholder(errand));
  // The answer is kept with the brukare it was read for, so a reply for somebody else is never shown.
  const [answer, setAnswer] = useState<{ readFor: string; reports: CaseStatusResponse[] }>();
  const loading = Boolean(partyId) && answer?.readFor !== partyId;
  const reports = partyId && answer?.readFor === partyId ? answer.reports : [];

  useEffect(() => {
    if (!partyId) return;
    let cancelled = false;
    getStatusesUsingPartyId(municipalityId, partyId)
      .then((statuses) => {
        if (!cancelled) setAnswer({ readFor: partyId, reports: otherReports(statuses ?? [], errand.id) });
      })
      .catch(() => {
        if (!cancelled) setAnswer({ readFor: partyId, reports: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [municipalityId, partyId, errand.id]);

  return (
    <Disclosure disabled={disabled} variant="alt" data-cy="connected-errands-disclosure">
      <Disclosure.Header>
        <Disclosure.Icon icon={<Link2 />} />
        <Disclosure.Title>Relaterade rapporter</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <h2 className="pt-[1.2rem] pb-[2.4rem] text-h2-md">Relaterade rapporter till brukaren</h2>
        {loading ? (
          <div className="flex justify-center items-center h-[5rem]">
            <Spinner aria-label="Relaterade rapporter läses in" />
          </div>
        ) : (
          <BaseRelationsTable
            errands={reports}
            headers={headers}
            dataCy="related-reports-table"
            renderRow={(report: CaseStatusResponse) => <RelationErrandCells errand={report} showOperation={false} />}
          />
        )}
      </Disclosure.Content>
    </Disclosure>
  );
};
