import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Dialog } from '@sk-web-gui/react';
import { IconName } from 'lucide-react/dynamic';

export const PhaseChangerDialogComponent: React.FC<{
  icon: IconName;
  title: string;
  message: JSX.Element;
  dialogIsOpen: boolean;
  setDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerPhaseChange: () => Promise<void>;
}> = ({ icon, title, message, dialogIsOpen, setDialogIsOpen, triggerPhaseChange }) => {
  return (
    <Dialog show={dialogIsOpen} className="w-[36rem]">
      <Dialog.Content className="flex flex-col items-center text-center">
        <LucideIcon name={icon as any} color="vattjom" size={32} />
        <h1 className="text-h3-md">{title}</h1>
        {message}
      </Dialog.Content>
      <Dialog.Buttons className="flex justify-center">
        <Button className="w-[12.8rem]" variant="secondary" onClick={() => setDialogIsOpen(false)}>
          Nej
        </Button>
        <Button className="w-[12.8rem]" variant="primary" onClick={() => triggerPhaseChange()}>
          Ja
        </Button>
      </Dialog.Buttons>
    </Dialog>
  );
};
