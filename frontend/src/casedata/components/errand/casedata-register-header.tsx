import { Button } from '@sk-web-gui/react';
import { useCasedataStore } from '@stores/index';
import { ArrowRight } from 'lucide-react';
import { SaveButtonComponent } from '../save-button/save-button.component';

export const CasedataRegisterHeader: React.FC = () => {
  const errand = useCasedataStore((s) => s.errand);

  if (!errand || errand.id) return null;

  return (
    <div data-cy="registerErrandHeading" className="flex justify-between items-center pt-8">
      <h1 className="text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
        Registrera nytt ärende
      </h1>
      <div className="flex gap-md">
        <Button
          variant="tertiary"
          onClick={() => {
            window.close();
          }}
        >
          Avbryt
        </Button>
        <SaveButtonComponent
          registeringNewErrand={errand?.id === undefined}
          setUnsaved={() => {}}
          update={() => {}}
          label="Registrera"
          color="vattjom"
          icon={<ArrowRight size={18} />}
        />
      </div>
    </div>
  );
};
