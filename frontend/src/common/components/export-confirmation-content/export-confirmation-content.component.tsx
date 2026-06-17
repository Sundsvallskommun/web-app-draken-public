import { ConfidentialExportAlert } from '@common/components/confidential-export-alert/confidential-export-alert.component';
import { Alert } from '@sk-web-gui/react';
import { FC } from 'react';

interface ExportConfirmationContentProps {
  /** Whether the export contains at least one confidential errand. */
  confidential?: boolean;
  /** Whether the export contains at least one errand that is not closed. */
  notClosed?: boolean;
  /** Heading for the confidential alert (defaults to the single-errand wording). */
  confidentialTitle?: string;
  /** Body text for the confidential alert. */
  confidentialNotice: string;
  /** Full sentence shown in the "not closed" info alert (includes its own question). */
  notClosedNotice: string;
  /** Plain question shown when there is no "not closed" warning. */
  question: string;
}

/**
 * Shared body for the export confirmation dialog, used by both the single errand
 * export and the errand list export. Renders an optional confidential warning and
 * either a "not closed" info alert (which carries its own question) or the plain
 * export question.
 */
export const ExportConfirmationContent: FC<ExportConfirmationContentProps> = ({
  confidential,
  notClosed,
  confidentialTitle,
  confidentialNotice,
  notClosedNotice,
  question,
}) => (
  <>
    {confidential && (
      <ConfidentialExportAlert title={confidentialTitle} className="mb-16">
        {confidentialNotice}
      </ConfidentialExportAlert>
    )}
    {notClosed ? (
      <Alert type="info" className="mb-16" data-cy="export-not-closed-warning">
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Description>{notClosedNotice}</Alert.Content.Description>
        </Alert.Content>
      </Alert>
    ) : (
      <p>{question}</p>
    )}
  </>
);
