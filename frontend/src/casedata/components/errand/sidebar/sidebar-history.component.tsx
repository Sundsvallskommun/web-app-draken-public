import { IErrand } from '@casedata/interfaces/errand';
import { GenericChangeData, ParsedErrandChange, ParsedErrandHistory } from '@casedata/interfaces/history';
import { fetchChangeData, getErrandHistory } from '@casedata/services/casedata-history-service';
import { useAppContext } from '@common/contexts/app.context';
import { sanitized } from '@common/services/sanitizer-service';
import { Admin } from '@common/services/user-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Modal, Spinner, cx } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

export const SidebarHistory: React.FC<{}> = () => {
  const {
    municipalityId,
    errand,
    administrators,
  }: { municipalityId: string; errand: IErrand; administrators: Admin[] } = useAppContext();
  const [history, setHistory] = useState<ParsedErrandHistory>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [selectedChange, setSelectedChange] = useState<ParsedErrandChange>();
  const [selectedChangeDetails, setSelectedChangeDetails] = useState<GenericChangeData>();

  useEffect(() => {
    if (errand) {
      setIsLoading(true);
      getErrandHistory(municipalityId, errand?.id.toString()).then((res) => {
        setHistory(res);
        setIsLoading(false);
      });
    }
  }, [errand]);

  useEffect(() => {
    if (selectedChange) {
      fetchChangeData(municipalityId, selectedChange)
        .then((res) => {
          setSelectedChangeDetails(res);
          setIsOpen(true);
        })
        .catch((e) => {
          console.error('Could not fetch change data');
        })
        .finally(() => {
          setIsLoading(false);
          setSelectedIndex(undefined);
        });
    }
  }, [selectedIndex]);

  return (
    <div className="relative h-full flex flex-col justify-start">
      <div className="px-0 flex justify-between items-center">
        <span className="text-base md:text-large xl:text-lead font-semibold">Ärendelogg</span>
      </div>
      {isLoading ? (
        <div className="mt-64 flex flex-col items-center justify-center gap-md">
          <Spinner size={2} />
          Hämtar logg
        </div>
      ) : (
        <>
          <div data-cy="history-wrapper">
            {history.map((p, idx) => {
              return (
                <div
                  key={`history-event-${idx}`}
                  className="first:mt-lg mb-xs relative pb-md px-md border-0 border-l-1 border-gray-300 flex flex-col gap-sm"
                  data-cy={`history-event-${idx}`}
                >
                  <div
                    className={cx(
                      p.property === 'phase' ? 'bg-gray-700' : 'bg-white',
                      `absolute m-0 p-0 flex items-start justify-start -left-[4px] top-0 w-[7px] h-[7px] border-2 border-gray-700 rounded-full`
                    )}
                  ></div>
                  <small className="font-normal -mt-[4px]">{p.parsed.datetime}</small>
                  <small>
                    {administrators.find((a) => a.adAccount === p.parsed.administrator)?.displayName ||
                      p.parsed.administrator}
                  </small>
                  <small>
                    <Button
                      aria-label={`${p.parsed.event.label}, visa.`}
                      variant="link"
                      onClick={() => {
                        setIsLoading(true);
                        setSelectedIndex(idx);
                        setSelectedChange(p);
                      }}
                      data-cy={`history-event-label-${idx}`}
                    >
                      {p.parsed.event.label}
                    </Button>
                  </small>
                </div>
              );
            })}
          </div>
          <Modal
            className="w-[64rem] px-40"
            show={isOpen}
            label={
              <div className="flex items-center gap-md">
                <LucideIcon name="history" />
                <h3 className="text-h3-sm md:text-h3-md xl:text-h3-lg">Detaljer</h3>
              </div>
            }
            onClose={() => {
              setIsOpen(false);
            }}
          >
            <Modal.Content>
              <p data-cy="history-details-type">{selectedChangeDetails?.type}</p>
              <div className="flex flex-col justify-center">
                <p data-cy="history-details-title">
                  <strong>{selectedChangeDetails?.title}</strong>
                </p>
                <p
                  data-cy="history-details-content"
                  dangerouslySetInnerHTML={{
                    __html: sanitized(selectedChangeDetails?.content || ''),
                  }}
                ></p>
                <p>
                  Uppdaterades:{' '}
                  {selectedChangeDetails?.date
                    ? dayjs(selectedChangeDetails?.date).format('YYYY-MM-DD HH:mm:ss')
                    : 'okänt'}
                </p>
              </div>
              <div className="my-md flex justify-end">
                <Button
                  data-cy="history-table-details-close-button"
                  className="w-full"
                  variant="primary"
                  color="primary"
                  onClick={() => {
                    setIsOpen(false);
                    setSelectedIndex(undefined);
                    setSelectedChange(undefined);
                  }}
                >
                  Stäng
                </Button>
              </div>
            </Modal.Content>
          </Modal>
        </>
      )}
    </div>
  );
};
