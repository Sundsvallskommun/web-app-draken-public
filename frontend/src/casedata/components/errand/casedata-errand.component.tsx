import { CasedataErrandFormProvider } from './casedata-errand-form-provider';
import { CasedataErrandLayout } from './casedata-errand-layout';
import { useCasedataErrandLoader } from './hooks/use-casedata-errand-loader';

export const CasedataErrandComponent: React.FC<{ errandNumber?: string }> = ({ errandNumber }) => {
  const { isLoading } = useCasedataErrandLoader(errandNumber);

  return (
    <CasedataErrandFormProvider>
      <CasedataErrandLayout isLoading={isLoading} />
    </CasedataErrandFormProvider>
  );
};
