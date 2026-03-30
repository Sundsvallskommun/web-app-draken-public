import iconMap from '@common/components/lucide-icon-map/lucide-icon-map.component';
import { Button, Dialog } from '@sk-web-gui/react';
import { IconName } from 'lucide-react/dynamic';
import { Dispatch, FC, JSX, SetStateAction } from 'react';
export const PhaseChangerDialogComponent: FC<{
  icon: IconName;
  title: string;
  message: JSX.Element;
  dialogIsOpen: boolean;
  setDialogIsOpen: Dispatch<SetStateAction<boolean>>;
  triggerPhaseChange: () => Promise<void>;
}> = ({ icon, title, message, dialogIsOpen, setDialogIsOpen, triggerPhaseChange }) => {
  return (
    <Dialog show={dialogIsOpen} className="w-[36rem]">
      <Dialog.Content className="flex flex-col items-center text-center">
        {(() => {
          const DynIcon = iconMap[icon as string];
          return DynIcon ? <DynIcon className="text-vattjom-surface-primary" size={32} /> : undefined;
        })()}
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
