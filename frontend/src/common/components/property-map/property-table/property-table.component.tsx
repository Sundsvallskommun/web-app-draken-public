'use client';

import { Button, Link, Pagination, Table } from '@sk-web-gui/react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SelectedFeature } from '../origo-map/map-selection';
import { type PropertyRow, toPropertyRow } from './property-row';

const areaFormat = new Intl.NumberFormat('sv-SE');

const PAGE_SIZE = 10;

interface PropertyTableProps {
  features: SelectedFeature[];
  /** Shows a "Lägg till" button on rows that `isAdded` doesn't report as added; loading until it resolves. */
  onAdd?: (row: PropertyRow) => Promise<void>;
  isAdded?: (row: PropertyRow) => boolean;
  /** The row under the pointer or holding focus, by feature id; null when none. */
  onHighlight?: (id: string | null) => void;
  /** Row to show as highlighted, e.g. the property under the pointer in the map. */
  highlightedId?: string | null;
}

const PropertyTable = ({ features, onAdd, isAdded, onHighlight, highlightedId }: PropertyTableProps) => {
  const { t } = useTranslation('map');
  const rows = features.map(toPropertyRow).filter((row) => row !== null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState<ReadonlySet<string>>(new Set());
  const headingId = useId();

  const add = async (row: PropertyRow) => {
    if (!onAdd) return;
    setAdding((ids) => new Set(ids).add(row.id));
    try {
      await onAdd(row);
    } finally {
      setAdding((ids) => {
        const next = new Set(ids);
        next.delete(row.id);
        return next;
      });
    }
  };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  // A new, smaller selection must not leave the table on a page that no longer exists.
  const activePage = Math.min(page, pages);
  const pageRows = rows.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  return (
    <section className="flex flex-col gap-12 mt-28" aria-labelledby={headingId}>
      <h2 id={headingId} className="text-h4-md">
        {t('properties_heading', { count: rows.length })}
      </h2>

      {rows.length === 0 ? (
        <p className="text-dark-secondary">{t('properties_empty')}</p>
      ) : (
        <Table dense scrollable="x">
          <Table.Header>
            <Table.HeaderColumn>{t('property_designation')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('property_tract')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('property_area')}</Table.HeaderColumn>
            <Table.HeaderColumn>{t('property_report')}</Table.HeaderColumn>
            {onAdd && (
              <Table.HeaderColumn>
                <span className="sr-only">{t('property_add')}</span>
              </Table.HeaderColumn>
            )}
          </Table.Header>
          <Table.Body>
            {pageRows.map((row) => (
              <Table.Row
                key={row.id}
                className={row.id === highlightedId ? 'bg-background-200' : undefined}
                onMouseEnter={() => onHighlight?.(row.id)}
                onMouseLeave={() => onHighlight?.(null)}
                onFocus={() => onHighlight?.(row.id)}
                onBlur={() => onHighlight?.(null)}
              >
                <Table.Column>{row.designation}</Table.Column>
                <Table.Column>{row.tract}</Table.Column>
                <Table.Column>
                  {row.areaSquareMeters === null ? '–' : `${areaFormat.format(row.areaSquareMeters)} m²`}
                </Table.Column>
                <Table.Column>
                  {row.reportUrl ? (
                    <Link href={row.reportUrl} external>
                      {t('property_report_link')}
                      <span className="sr-only"> {row.designation}</span>
                    </Link>
                  ) : (
                    '–'
                  )}
                </Table.Column>
                {onAdd && (
                  <Table.Column>
                    {isAdded?.(row) ? null : (
                      <Button
                        variant="tertiary"
                        size="sm"
                        loading={adding.has(row.id)}
                        disabled={adding.has(row.id)}
                        onClick={() => void add(row)}
                      >
                        {t('property_add')}
                        <span className="sr-only"> {row.designation}</span>
                      </Button>
                    )}
                  </Table.Column>
                )}
              </Table.Row>
            ))}
          </Table.Body>
          {pages > 1 && (
            <Table.Footer>
              <div className="sk-table-paginationwrapper">
                <Pagination
                  showFirst
                  showLast
                  pagesBefore={1}
                  pagesAfter={1}
                  showConstantPages={true}
                  fitContainer
                  pages={pages}
                  activePage={activePage}
                  changePage={setPage}
                />
              </div>
            </Table.Footer>
          )}
        </Table>
      )}
    </section>
  );
};

export default PropertyTable;
