import { Alert } from '@sk-web-gui/react';
import { FC, ReactNode } from 'react';

interface ConfidentialExportAlertProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export const ConfidentialExportAlert: FC<ConfidentialExportAlertProps> = ({
  title = 'Sekretessmarkerat ärende',
  children,
  className,
}) => (
  <Alert type="warning" className={className} data-cy="confidential-export-warning">
    <Alert.Icon />
    <Alert.Content>
      <Alert.Content.Title>{title}</Alert.Content.Title>
      <Alert.Content.Description>{children}</Alert.Content.Description>
    </Alert.Content>
  </Alert>
);
