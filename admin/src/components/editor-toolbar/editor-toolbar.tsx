import { ResourceName } from '@interfaces/resource-name';
import { Button } from '@sk-web-gui/react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';

interface ToolbarProps {
  resource: ResourceName;
  id?: number;
  isDirty?: boolean;
}

export const EditorToolbar: React.FC<ToolbarProps> = ({ isDirty }) => {
  const { t } = useTranslation();
  return (
    <Button.Group className="absolute top-40 right-48 w-fit">
      <Button
        type="submit"
        color="vattjom"
        size="sm"
        showBackground={false}
        leftIcon={<Save />}
        disabled={!isDirty}
        iconButton
        aria-label={capitalize(t('common:save'))}
      ></Button>
    </Button.Group>
  );
};
