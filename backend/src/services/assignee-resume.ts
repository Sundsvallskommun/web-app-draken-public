import { Event, Operation } from '@/data-contracts/supportmanagement/data-contracts';

const ASSIGNED_STATUS = 'ASSIGNED';

/** One write to an errand, with what it changed. */
export interface ErrandHistoryEntry {
  readonly at: string;
  readonly operations: readonly Operation[];
}

/** The revisions an errand event moved the errand between, when it is a write to the errand itself. */
export const readErrandEventVersions = (event: Event): { previous: string; current: string } | undefined => {
  if (event.subType !== 'ERRAND' || !event.created) return undefined;
  const metadata = new Map((event.metadata ?? []).map(({ key, value }) => [key, value]));
  const previous = metadata.get('PreviousVersion');
  const current = metadata.get('CurrentVersion');
  return previous && current ? { previous, current } : undefined;
};

const changedValue = (entry: ErrandHistoryEntry, path: string): string | undefined =>
  entry.operations.find(operation => operation.path === path && (operation.op === 'replace' || operation.op === 'add'))?.value;

/** Whether the write gave the errand to this person. */
export const assignsErrandTo = (entry: ErrandHistoryEntry, assignee: string): boolean =>
  changedValue(entry, '/assignedUserId')?.trim().toLowerCase() === assignee.trim().toLowerCase();

/**
 * When the errand's handler took it up after it was given to them: the first change of status away from
 * ASSIGNED from their latest assignment on - the assignment itself, when the same write moved the status on.
 * An errand not taken up yet answers the assignment; a history naming no assignment to them answers nothing.
 *
 * `historyNewestFirst` is in the event log's order, and need reach no further back than the assignment.
 */
export const resolveAssigneeResumedAt = (historyNewestFirst: readonly ErrandHistoryEntry[], assignee: string): string | undefined => {
  let resumedAt: string | undefined;
  for (const entry of historyNewestFirst) {
    const status = changedValue(entry, '/status');
    if (status !== undefined && status !== ASSIGNED_STATUS) resumedAt = entry.at;
    if (assignsErrandTo(entry, assignee)) return resumedAt ?? entry.at;
  }
  return undefined;
};
