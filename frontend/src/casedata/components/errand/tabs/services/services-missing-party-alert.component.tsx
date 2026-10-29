import { Alert } from '@sk-web-gui/react';
import { FC } from 'react';

export const ServicesMissingPartyAlert: FC = () => (
  <Alert type="info" className="mt-24" data-cy="services-missing-party-alert">
    <Alert.Icon />
    <Alert.Content>
      <Alert.Content.Title>Insatser kan inte läggas till</Alert.Content.Title>
      <Alert.Content.Description>
        Ärendeägaren saknas eller har lagts till manuellt utan personuppslag. Lägg till ärendeägaren genom att söka på
        personnummer under Grunduppgifter för att kunna lägga till insatser.
      </Alert.Content.Description>
    </Alert.Content>
  </Alert>
);
