import { useAppContext } from '@contexts/app.context';
import { SupportErrand } from '@supportmanagement/services/support-errand-service';
import { useEffect, useMemo, useState } from 'react';
import { CParameter } from 'src/data-contracts/backend/data-contracts';

interface SickPeriod {
  index: string;
  value: string[];
}

export const SupportErrandDetailsTab: React.FC<{}> = () => {
  const {
    supportErrand,
  }: {
    supportErrand: SupportErrand;
  } = useAppContext();

  const [handledParams, setHandledParams] = useState<CParameter[]>([]);

  const handleDates = (params: CParameter[]) => {
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

  /* First Group - General Parameters */
  const firstErrands = handledParams.filter((p) => {
    return (
      !p.key.includes('sickNoteDates-') &&
      !['sickNoteStartDates', 'sickNoteEndDates', 'sickNotePercentages', 'timeCare', 'currentSchedule'].includes(p.key)
    );
  });

  const groupedSickPeriods = useMemo(
    () => handledParams.filter((param) => param.key.startsWith('sickNoteDates-')),
    [handledParams]
  );
  const [timeCare, currentSchedule] = useMemo(
    () => [
      handledParams.find((param) => param.key === 'timeCare'),
      handledParams.find((param) => param.key === 'currentSchedule'),
    ],
    [handledParams]
  );

  const groupedSickInfo = useMemo(
    () => ({
      sickPeriods: groupedSickPeriods.map(
        (param) =>
          ({
            index: param.key.split('-')[1],
            value: param.values,
          } as SickPeriod)
      ),
      timeCare: timeCare?.values ?? null,
      currentSchedule: currentSchedule?.values ?? null,
    }),
    [groupedSickPeriods, timeCare, currentSchedule]
  );
  /* Second Group - Sick Period Details */
  const secondErrands = useMemo(
    () =>
      groupedSickInfo.sickPeriods.map((sickPeriod) => ({
        index: sickPeriod.index,
        sickPeriod: sickPeriod.value,
        timeCare: groupedSickInfo.timeCare,
        currentSchedule: groupedSickInfo.currentSchedule,
      })),
    [groupedSickInfo]
  );

  const renderedFirstErrands = useMemo(
    () =>
      firstErrands
        .filter((param) => param.values?.length > 0)
        .map((param, idx) => (
          <div key={`first-${param.key}-${idx}`} className="flex flex-row gap-md my-sm">
            <div className="font-bold">{param.displayName}</div>
            <div>{param.values.join(', ')}</div>
          </div>
        )),
    [firstErrands]
  );

  const renderedSecondErrands = useMemo(
    () =>
      secondErrands.map((errand, idx) => {
        const periodIndex = Number(errand.index);
        return (
          <div
            key={`period-${periodIndex}`}
            className="flex flex-col gap-md p-16 mb-24 bg-primitives-gray-50 rounded-lg"
          >
            <h3 className="text-h3-md">Sjukskrivningsperiod {periodIndex + 1}</h3>

            {/* Sick Period */}
            <div className="flex flex-row gap-md">
              <div className="font-bold w-1/4">Datum:</div>
              <div className="flex-1">{errand.sickPeriod}</div>
            </div>

            {/* TimeCare - Index-matched */}
            <div className="flex flex-row gap-md">
              <div className="font-bold w-1/4">Använder verksamheten TimeCare?</div>
              <div className="flex-1">{errand.timeCare?.[periodIndex] || 'Ej angivet'}</div>
            </div>

            {/* Current Schedule - Index-matched */}
            <div className="flex flex-row gap-md">
              <div className="font-bold w-1/4">Finns pågående schemaperiod?</div>
              <div className="flex-1">{errand.currentSchedule?.[periodIndex] || 'Ej angivet'}</div>
            </div>
          </div>
        );
      }),
    [secondErrands]
  );

  return (
    <div className="pt-xl pb-16 px-40 flex flex-col">
      <div className="flex flex-col gap-md mb-32">
        <h2 className="text-h2-md">Ärendeuppgifter</h2>
        {/* First Group - General Parameters */}
        <div className="bg-primitives-gray-50 rounded-lg gap-md p-16">
          <h3 className="text-h3-md mb-12">Grunduppgifter</h3>
          {supportErrand?.externalTags?.find((tag) => tag.key === 'caseId')?.value ? (
            <div className="flex flex-row gap-md">
              <strong>Ärendenummer i e-tjänst</strong>
              <span>{supportErrand.externalTags.find((tag) => tag.key === 'caseId')?.value}</span>
            </div>
          ) : null}
          {renderedFirstErrands}
        </div>

        {/* Second Group - Sick Period Details */}
        {secondErrands.length > 0 && (
          <div className="mt-24">
            <h3 className="text-h3-md mb-12">Sjukskrivningsdetaljer</h3>
            {renderedSecondErrands}
          </div>
        )}
        <div className="my-md gap-xl"></div>
      </div>
    </div>
  );
};
