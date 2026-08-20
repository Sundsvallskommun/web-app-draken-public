import { Button, Dialog } from '@sk-web-gui/react';
import { ArrowRightCircle } from 'lucide-react';
import { Dispatch, FC, SetStateAction, useState } from 'react';

export const SendDecisionDialogComponent: FC<{
  dialogIsOpen: boolean;
  setDialogIsOpen: Dispatch<SetStateAction<boolean>>;
  saveAndSend: () => Promise<void>;
}> = ({ dialogIsOpen, setDialogIsOpen, saveAndSend }) => {
  const [isSending, setIsSending] = useState(false);

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      await saveAndSend();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog show={dialogIsOpen} className="w-[36rem]">
      <Dialog.Content className="flex flex-col items-center text-center">
        <ArrowRightCircle className="text-vattjom-surface-primary" size={32} />

        <h1 className="text-h3-md">Skicka beslut?</h1>
        <p>Är du säker på att du vill skicka beslutet? Du kan inte ångra detta steg.</p>
      </Dialog.Content>
      <Dialog.Buttons className="flex justify-center">
        <Button className="w-[12.8rem]" variant="secondary" onClick={() => setDialogIsOpen(false)} disabled={isSending}>
          Nej
        </Button>
        <Button
          className="w-[12.8rem]"
          variant="primary"
          onClick={handleConfirm}
          loading={isSending}
          loadingText="Skickar..."
        >
          Ja
        </Button>
      </Dialog.Buttons>
    </Dialog>
  );
};
