import { CaseLabels } from '@casedata/interfaces/case-label';
import { BaseRelationsTable } from '@common/components/base-relation-table/base-relation-table.component';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import { Relation } from '@common/services/relations-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Table } from '@sk-web-gui/react';
import React from 'react';

interface SupportRelationsTableProps {
  errands: CaseStatusResponse[];
  headers: React.ReactNode;
  linkedStates: Relation[];
  handleLinkClick: (index: string) => void;
  title: string;
  dataCy: string;
}

const LinkButtonComponent: React.FC<{ isLinked: boolean; onClick: () => void }> = ({ isLinked, onClick }) => {
  return (
    <Button
      variant={isLinked ? 'secondary' : 'primary'}
      color={'primary'}
      size="sm"
      className="w-full"
      onClick={onClick}
      leftIcon={<LucideIcon name={isLinked ? 'link-2-off' : 'link-2'} size={16} />}
    >
      {isLinked ? 'Bryt länk' : 'Länka'}
    </Button>
  );
};

export const SupportRelationsTable: React.FC<SupportRelationsTableProps> = ({
  errands,
  headers,
  linkedStates,
  handleLinkClick,
  title,
  dataCy,
}) => {
  return (
    <BaseRelationsTable
      errands={errands}
      headers={headers}
      title={title}
      dataCy={dataCy}
      renderRow={(errand) => (
        <>
          <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
            <CaseStatusLabelComponent status={errand.status} />
          </Table.HeaderColumn>
          <Table.Column className="w-[17rem]">{CaseLabels.ALL[errand.caseType] ?? errand.caseType}</Table.Column>
          <Table.Column>{findOperationUsingNamespace(errand.namespace)}</Table.Column>
          <Table.Column>{errand.errandNumber}</Table.Column>
          <Table.Column className="w-[15.4rem]">
            <div className="flex justify-center">
              <LinkButtonComponent
                isLinked={linkedStates.some((relation) => relation.target.resourceId === errand.caseId)}
                onClick={() => handleLinkClick(errand.caseId)}
              />
            </div>
          </Table.Column>
        </>
      )}
    />
  );
};
