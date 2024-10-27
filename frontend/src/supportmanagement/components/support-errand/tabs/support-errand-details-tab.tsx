import { User } from '@common/interfaces/user';
import { useAppContext } from '@contexts/app.context';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';

export const SupportErrandDetailsTab: React.FC<{}> = () => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Ärendeuppgifter</h2>
        {supportErrand?.parameters &&
          supportErrand.parameters
            .filter((param) => param.values?.length > 0)
            .map((param, idx) => (
              <div key={`${param.key}-${idx}`} className="flex flex-row gap-md">
                <div className="font-bold" key={`label-${idx}`}>
                  {param.displayName}
                </div>
                <div className="flex gap-md">
                  <div>{param.values.join(', ')}</div>
                </div>
              </div>
            ))}
        <div className="my-md gap-xl"></div>
      </div>
    </div>
  );
};
