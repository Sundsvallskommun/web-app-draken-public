import { useAppContext } from '@contexts/app.context';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useState } from 'react';

export const SupportErrandDetailsTab: React.FC<{}> = () => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

  const [handledParams, setHandledParams] = useState<
    {
      key: string;
      displayName: string;
      values: string[];
    }[]
  >([]);

  const handleDates = (
    params: {
      key: string;
      displayName: string;
      values: string[];
    }[]
  ) => {
    const handled = [...params];
    if (
      handled.some((param) => param.key === 'sickNoteStartDates') &&
      handled.some((param) => param.key === 'sickNoteEndDates') &&
      handled.some((param) => param.key === 'sickNotePercentages')
    ) {
      const sickNoteStartDates = handled.find((param) => param.key === 'sickNoteStartDates')?.values;
      const sickNoteEndDates = handled.find((param) => param.key === 'sickNoteEndDates')?.values;
      const sickNotePercentages = handled.find((param) => param.key === 'sickNotePercentages')?.values;
      const zippedDates = sickNoteStartDates?.map(
        (startDate, idx) => `${startDate} - ${sickNoteEndDates[idx]} (${sickNotePercentages[idx]}%)`
      );
      zippedDates.forEach((date, idx) => {
        handled.push({
          key: `sickNoteDates-${idx}`,
          displayName: `Sjukskrivningsperiod ${idx + 1}`,
          values: [date],
        });
      });
      handled.splice(
        handled.findIndex((param) => param.key === 'sickNoteStartDates'),
        1
      );
      handled.splice(
        handled.findIndex((param) => param.key === 'sickNoteEndDates'),
        1
      );
      handled.splice(
        handled.findIndex((param) => param.key === 'sickNotePercentages'),
        1
      );
    }

    return handled;
  };

  useEffect(() => {
    if (supportErrand?.parameters) {
      setHandledParams(handleDates(supportErrand.parameters));
    }
  }, [supportErrand]);

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Ärendeuppgifter</h2>
        {handledParams &&
          handledParams
            .filter((param) => param.values?.length > 0)
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
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
