import { CaseLabels } from '@casedata/interfaces/case-label';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { SortMode, Table } from '@sk-web-gui/react';
import { FC, ReactNode } from 'react';

interface RelationTableLabel {
  readonly label: string;
  readonly screenReaderOnly: boolean;
  readonly sortable: boolean;
}

/** The header row of a relations table, from its labels. */
export const relationTableHeaders = (labels: readonly RelationTableLabel[]): ReactNode =>
  labels.map((header, index) => (
    <Table.HeaderColumn key={`header-${index}`} sticky={true}>
      {header.screenReaderOnly ? (
        <span className="sr-only">{header.label}</span>
      ) : header.sortable ? (
        <Table.SortButton isActive={true} sortOrder={'ASC' as SortMode} onClick={() => {}}>
          {header.label}
        </Table.SortButton>
      ) : (
        header.label
      )}
    </Table.HeaderColumn>
  ));

/**
 * What a relations table says about an errand: its status, type, operation and number. A table whose errands all
 * belong to the drake itself leaves the operation out.
 */
export const RelationErrandCells: FC<{ errand: CaseStatusResponse; showOperation?: boolean }> = ({
  errand,
  showOperation = true,
}) => (
  <>
    <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
      <CaseStatusLabelComponent externalStatus={errand.externalStatus ?? ''} />
    </Table.HeaderColumn>
    <Table.Column className="w-[16rem]">
      {(CaseLabels.ALL as Record<string, string>)[errand.caseType ?? ''] ?? errand.caseType}
    </Table.Column>
    {showOperation && (
      <Table.Column className="w-[10rem]">{findOperationUsingNamespace(errand.namespace ?? '')}</Table.Column>
    )}
    <Table.Column className="w-[14.5rem]">{errand.errandNumber}</Table.Column>
  </>
);

interface BaseRelationsTableProps {
  errands: CaseStatusResponse[];
  headers: ReactNode;
  /** The table's own heading. Left out, a heading above it names it. */
  title?: string;
  dataCy: string;
  renderRow: (errand: any, index: number) => ReactNode;
}

export const BaseRelationsTable: FC<BaseRelationsTableProps> = ({ errands, headers, title, dataCy, renderRow }) => {
  return (
    <>
      {title !== undefined && <h3 className="py-[1.2rem] text-h3-md">{title}</h3>}
      <Table data-cy={dataCy} aria-describedby={`${dataCy}-table`} scrollable>
        {!errands.length ? (
          <caption id={`${dataCy}TableCaption`} className="my-32">
            Det finns inga ärenden
          </caption>
        ) : (
          <>
            <Table.Header>{headers}</Table.Header>
            <Table.Body>
              {errands.map((errand, index) => (
                <Table.Row key={`row-${index}`}>{renderRow(errand, index)}</Table.Row>
              ))}
            </Table.Body>
          </>
        )}
      </Table>
    </>
  );
};
