import { appConfig } from '@config/appconfig';
import { Alert } from '@sk-web-gui/react';
import { FC } from 'react';

export const OverviewNotice: FC = () => {
  if (!appConfig.features.useOverviewNotice) {
    return null;
  }

  return (
    <Alert type="info" className="mt-16" data-cy="overview-notice">
      <Alert.Icon />
      <Alert.Content>
        <Alert.Content.Title>Draken för Alkohol och tobak är under uppbyggnad</Alert.Content.Title>
        <Alert.Content.Description>
          Ärendetyper, statusar och handläggningsflöde tillkommer efter hand. Hör av dig till förvaltningen om något
          saknas.
        </Alert.Content.Description>
      </Alert.Content>
    </Alert>
  );
};
