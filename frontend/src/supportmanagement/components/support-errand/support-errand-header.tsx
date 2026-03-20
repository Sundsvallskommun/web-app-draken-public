import { useMetadataStore, useSupportStore } from '@stores/index';
import { appConfig } from '@config/appconfig';
import { supportErrandIsEmpty } from '@supportmanagement/services/support-errand-service';
import { Button } from '@sk-web-gui/react';
import { SupportErrandSummary } from '../support-errand-basics-form/support-errand-summary.component';

export const SupportErrandHeader: React.FC = () => {
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const categoriesList = supportMetadata?.categories;

  if (!supportErrand) return null;

  if (!supportErrandIsEmpty(supportErrand)) {
    return (
      <>
        <h1 className="max-md:w-full text-h2-sm md:text-h2-md xl:text-h2-md mb-0 break-words">
          {appConfig.features.useThreeLevelCategorization
            ? supportErrand.labels?.find((l) => l.classification === 'TYPE')?.displayName ??
              '(Ärendetyp saknas)'
            : categoriesList?.find((c) => c.name === supportErrand?.classification?.category)
                ?.displayName}
        </h1>
        {process.env.NEXT_PUBLIC_APPLICATION === 'IAF' && <SupportErrandSummary />}
      </>
    );
  }

  return (
    <div className="flex justify-between items-center pt-8">
      <h1 className="text-h3-sm md:text-h3-md xl:text-h2-lg mb-0 break-words">
        Registrera nytt ärende
      </h1>
      <div className="flex gap-md">
        <Button variant="tertiary" onClick={() => window.close()}>
          Avbryt
        </Button>
      </div>
    </div>
  );
};
