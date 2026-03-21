import { useSupportErrandLoader } from './hooks/use-support-errand-loader';
import { SupportErrandFormProvider } from './support-errand-form-provider';
import { SupportErrandLayout } from './support-errand-layout';

export const SupportErrandComponent: React.FC<{ errandNumber?: string }> = ({ errandNumber }) => {
  const { isLoading, message } = useSupportErrandLoader(errandNumber);

  return (
    <SupportErrandFormProvider>
      <SupportErrandLayout isLoading={isLoading} loadingMessage={message} />
    </SupportErrandFormProvider>
  );
};
