import React from 'react';
import { Button, useConfirm } from '@sk-web-gui/react';
import { exportErrands } from '@common/services/export-service';
import { ErrandsData } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';

interface ExportButtonProps {
  errands: ErrandsData;
  municipalityId: string;
}

export const ExportButton: React.FC<ExportButtonProps> = (props) => {
  const exportConfirm = useConfirm();

  const { errands, municipalityId } = props;

  const isErrandNotClosed = () => {
    return errands.errands.some((errand) => errand.status.statusType !== ErrandStatus.ArendeAvslutat);
  };

  const handleExportErrands = () => {
    exportErrands(municipalityId, errands.errands).then(() => {});
  };

  return (
    <Button
      onClick={async () => {
        const confirmed = await exportConfirm.showConfirmation(
          'Exportera listan?',
          `${
            isErrandNotClosed()
              ? 'Det finns ärenden som inte är avslutade. Vill du ändå exportera listan?'
              : 'Vill du exportera listan?'
          }`,
          'Ja',
          'Nej',
          'info'
        );
        if (confirmed) {
          handleExportErrands();
        }
      }}
    >
      Exportera listan
    </Button>
  );
};
