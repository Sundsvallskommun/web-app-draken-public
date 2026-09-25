import { Alert, Button } from '@sk-web-gui/react';
import { FC } from 'react';

/**
 * The save button of a tab that owns its own resource, with what is written but not yet saved
 * spelled out beside it. The errand itself is saved from the sidebar, so a tab with its own
 * resource has a second button, and the handler needs to see which one is still waiting.
 */
export const SaveRow: FC<{
  label: string;
  loadingText?: string;
  saving?: boolean;
  disabled?: boolean;
  onSave: () => void;
  unsaved?: boolean;
  unsavedTitle?: string;
  unsavedText?: string;
  dataCy: string;
}> = ({ label, loadingText, saving, disabled, onSave, unsaved, unsavedTitle, unsavedText, dataCy }) => (
  <div className="flex items-center gap-16">
    <Button
      variant="primary"
      color="vattjom"
      loading={saving}
      loadingText={loadingText}
      disabled={disabled}
      onClick={onSave}
      data-cy={dataCy}
    >
      {label}
    </Button>

    {unsaved ? (
      <Alert type="info" data-cy={`${dataCy}-unsaved`}>
        <Alert.Icon />
        <Alert.Content>
          <Alert.Content.Title>{unsavedTitle}</Alert.Content.Title>
          <Alert.Content.Description>{unsavedText}</Alert.Content.Description>
        </Alert.Content>
      </Alert>
    ) : null}
  </div>
);
