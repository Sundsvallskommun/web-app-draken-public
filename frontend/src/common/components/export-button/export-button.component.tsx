import { ErrandsData } from '@casedata/interfaces/errand';
import { ErrandStatus } from '@casedata/interfaces/errand-status';
import { ExportConfirmationContent } from '@common/components/export-confirmation-content/export-confirmation-content.component';
import { downloadPdf, exportErrands } from '@common/services/export-service';
import { Button, useConfirm, useSnackbar } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { Download } from 'lucide-react';
import { FC, useState } from 'react';
interface ExportButtonProps {
  errands: ErrandsData;
  municipalityId: string;
}

export const ExportButton: FC<ExportButtonProps> = (props) => {
  const exportConfirm = useConfirm();
  const [isExportLoading, setIsExportLoading] = useState<boolean>(false);
  const toastMessage = useSnackbar();

  const { errands, municipalityId } = props;

  const isErrandNotClosed = () => {
    return errands.errands.some((errand) => errand.status.statusType !== ErrandStatus.ArendeAvslutat);
  };

  const hasConfidential = () => {
    return errands.errands.some((errand) => errand.confidential);
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
      variant="secondary"
      loading={isExportLoading}
      loadingText="Exporterar..."
      leftIcon={<Download />}
      onClick={async () => {
        const confidential = hasConfidential();
        const notClosed = isErrandNotClosed();
        const confidentialNotice =
          'Listan innehåller sekretessmarkerade ärenden. Exporten kan innehålla sekretessbelagda uppgifter – det är ditt ansvar att maskera de delar som omfattas av sekretess efter export.';
        const confirmed = await exportConfirm.showConfirmation(
          confidential ? 'Exportera lista med sekretess?' : 'Exportera listan?',
          <ExportConfirmationContent
            confidential={confidential}
            notClosed={notClosed}
            confidentialTitle="Sekretessmarkerade ärenden"
            confidentialNotice={confidentialNotice}
            notClosedNotice="Det finns ärenden som inte är avslutade. Vill du ändå exportera listan?"
            question="Vill du exportera listan?"
          />,
          'Ja',
          'Nej',
          confidential ? 'warning' : 'info'
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
