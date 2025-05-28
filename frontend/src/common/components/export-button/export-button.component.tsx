import { ErrandsData } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { downloadPdf, exportErrands } from '@common/services/export-service';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import React, { useState } from 'react';

interface ExportButtonProps {
  errands: ErrandsData;
  municipalityId: string;
}

export const ExportButton: React.FC<ExportButtonProps> = (props) => {
  const exportConfirm = useConfirm();
  const [isExportLoading, setIsExportLoading] = useState<boolean>(false);
  const toastMessage = useSnackbar();

  const { errands, municipalityId } = props;

  const isErrandNotClosed = () => {
    return errands.errands.some((errand) => errand.status.statusType !== ErrandStatus.ArendeAvslutat);
  };

  const handleExportErrands = () => {
    setIsExportLoading(true);
    exportErrands(municipalityId, errands.errands).then((pdf) => {
      downloadPdf(
        pdf,
        `Arendelista-${dayjs().format('YYYY-MM-DD')}.pdf`,
        () => setIsExportLoading(false),
        () => {
          setIsExportLoading(false);
          toastMessage({
            position: 'bottom',
            closeable: false,
            message: 'Något gick fel när ärendeexporten genererades',
            status: 'error',
          });
        }
      );
    });
  };

  return (
    <Button
      loading={isExportLoading}
      loadingText="Exporterar..."
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
      data-cy="export-button"
    >
      Exportera listan
    </Button>
  );
};
