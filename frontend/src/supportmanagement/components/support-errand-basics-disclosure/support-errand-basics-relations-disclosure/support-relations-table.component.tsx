import React from 'react';
import { Button, Table } from '@sk-web-gui/react';
import { CasedataStatusLabelComponent } from '@casedata/components/ongoing-casedata-errands/components/casedata-status-label.component';
import { CaseStatusResponse, findOperationUsingNamespace } from '@common/services/casestatus-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { findStatusLabelForStatusKey } from '@casedata/services/casedata-errand-service';
import { Relation } from '@common/services/relations-service';
import { CaseLabels } from '@casedata/interfaces/case-label';
import { CaseStatusLabelComponent } from '@common/components/case-status-label/case-status-label.component';

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
    <>
      <h3 className="py-[1.2rem]">{title}</h3>
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
                <Table.Row key={`row-${index}`}>
                  <Table.HeaderColumn scope="row" className="w-[22rem] overflow-hidden text-ellipsis table-caption">
                    <CaseStatusLabelComponent status={errand.status} />
                  </Table.HeaderColumn>
                  <Table.Column className="w-[17rem]">
                    {CaseLabels.ALL[errand.caseType] ?? errand.caseType}
                  </Table.Column>
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
                </Table.Row>
              ))}
            </Table.Body>
          </>
        )}
      </Table>
    </>
  );
};
