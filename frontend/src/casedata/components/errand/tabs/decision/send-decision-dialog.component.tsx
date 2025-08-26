import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Dialog } from '@sk-web-gui/react';

export const SendDecisionDialogComponent: React.FC<{
  dialogIsOpen: boolean;
  setDialogIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  saveAndSend: () => Promise<void>;
}> = ({ dialogIsOpen, setDialogIsOpen, saveAndSend }) => {
  return (
    <Dialog show={dialogIsOpen} className="w-[36rem]">
      <Dialog.Content className="flex flex-col items-center text-center">
        <LucideIcon name="arrow-right-circle" color="vattjom" size={32} />

        <h1 className="text-h3-md">Skicka beslut?</h1>
        <p>Är du säker på att du vill skicka beslutet? Du kan inte ångra detta steg.</p>
      </Dialog.Content>
      <Dialog.Buttons className="flex justify-center">
        <Button className="w-[12.8rem]" variant="secondary" onClick={() => setDialogIsOpen(false)}>
          Nej
        </Button>
        <Button className="w-[12.8rem]" variant="primary" onClick={() => saveAndSend()}>
          Ja
        </Button>
      </Dialog.Buttons>
    </Dialog>
  );
};
