import { useAppContext } from '@common/contexts/app.context';
import { sanitized } from '@common/services/sanitizer-service';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Avatar, Button, Modal, Spinner } from '@sk-web-gui/react';
import { Priority } from '@supportmanagement/interfaces/priority';
import { ParsedSupportEvent } from '@supportmanagement/interfaces/supportEvent';
import { ParsedSupportRevisionDifference } from '@supportmanagement/interfaces/supportRevisionDiff';
import { SupportAdmin } from '@supportmanagement/services/support-admin-service';
import {
  Channels,
  ResolutionLabelIK,
  ResolutionLabelKS,
  ResolutionLabelLOP,
  StatusLabel,
  SupportErrand,
} from '@supportmanagement/services/support-errand-service';
import { getSupportErrandEvents } from '@supportmanagement/services/support-history-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { fetchRevisionDiff } from '@supportmanagement/services/support-revision-service';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

export const SidebarHistory: React.FC<{}> = () => {
  const {
    municipalityId,
    supportErrand,
    setSupportErrand,
    supportMetadata,
    supportAdmins,
  }: {
    municipalityId: string;
    supportErrand: SupportErrand;
    setSupportErrand: (supportErrand: SupportErrand) => void;
    supportMetadata: SupportMetadata;
    supportAdmins: SupportAdmin[];
  } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [events, setEvents] = useState<ParsedSupportEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [selectedChange, setSelectedChange] = useState<ParsedSupportEvent>();
  const [selectedChangeDetails, setSelectedChangeDetails] = useState<ParsedSupportRevisionDifference[]>();
  const [keyMapper, setKeyMapper] = useState<{ [key: string]: string }>();
  let initialFocus = useRef(null);

  useEffect(() => {
    if (supportErrand && keyMapper && Object.keys(keyMapper).length > 1) {
      setError(false);
      setIsLoading(true);
      getSupportErrandEvents(supportErrand?.id, municipalityId, keyMapper)
        .then((res) => {
          setEvents(res);
          setIsLoading(false);
        })
        .catch((e) => setError(true));
    }
  }, [supportErrand, keyMapper]);

  useEffect(() => {
    const _km = { NONE: 'Ingen' };
    Object.entries(StatusLabel).forEach((e) => {
      _km[e[0]] = e[1];
    });
    [
      ...Object.entries(ResolutionLabelKS),
      ...Object.entries(ResolutionLabelLOP),
      ...Object.entries(ResolutionLabelIK),
    ].forEach((e) => {
      _km[e[0]] = e[1];
    });
    Object.entries(Priority).forEach((e) => {
      _km[e[0]] = e[1];
    });
    Object.entries(Channels).forEach((e) => {
      _km[e[0]] = e[1];
    });
    _km['true'] = 'Ja';
    _km['false'] = 'Nej';
    supportMetadata?.categories.forEach((c) => {
      _km[c.name] = c.displayName;
      c.types.forEach((t) => {
        _km[t.name] = t.displayName;
      });
    });
    setKeyMapper(_km);
  }, [supportMetadata]);

  useEffect(() => {
    if (selectedChange) {
      // setSelectedChangeDetails(selectedChange.parsed.diffList);
      // setIsOpen(true);
      // TODO Fetch revison diff on modal opening or when fetching events (slow)?
      fetchRevisionDiff(supportErrand.id, selectedChange, municipalityId, keyMapper, supportAdmins)
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
    <div className="relative h-full flex flex-col justify-start" data-cy="history-log">
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
          <div>
            {events?.map((p, idx) => {
              return (
                <div
                  key={`history-event-${idx}`}
                  className={
                    'history-event first:mt-lg mb-xs relative pb-md px-md flex flex-col gap-sm' +
                    (idx < events.length - 1 && 'border-0 border-l-1 border-gray-300')
                  }
                >
                  <div className="bg-white absolute m-0 p-0 flex items-start justify-start -left-[4px] top-0 w-[7px] h-[7px] border-2 border-gray-700 rounded-full"></div>
                  <small className="font-normal -mt-[4px] mb-6">{p.parsed.datetime}</small>
                  <small className="mb-6">
                    {/* TODO User image or initials for Avatar */}
                    <Avatar rounded size="sm" className="mr-8" />
                    {p.metadata.find((a) => a.key === 'ExecutedBy')?.value}
                    {/*{administrators.find((a) => a.adAccount === p.parsed.administrator)?.displayName ||
                      p.parsed.administrator}*/}
                  </small>
                  <small>
                    <Button
                      aria-label={`${p.parsed.event}, visa.`}
                      variant="link"
                      className="text-dark-secondary"
                      onClick={() => {
                        setIsLoading(true);
                        setSelectedIndex(idx);
                        setSelectedChange(p);
                      }}
                    >
                      {p.message}
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
              <p>{selectedChange?.message}</p>
              <div className="flex flex-col justify-center">
                <p data-cy="history-table-details-title">
                  {selectedChangeDetails?.map((details, index) => {
                    return (
                      <>
                        <strong key={index}>{details.title + '\n'}</strong>

                        <p
                          data-cy="history-table-details-content"
                          dangerouslySetInnerHTML={{
                            __html: sanitized(details.description || ''),
                          }}
                        ></p>
                      </>
                    );
                  })}
                </p>

                <p>
                  Uppdaterades:{' '}
                  {selectedChange?.created ? dayjs(selectedChange?.created).format('YYYY-MM-DD HH:mm:ss') : 'okänt'}
                </p>
              </div>
            </Modal.Content>
            <Modal.Footer>
              <div className="flex justify-end w-full">
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
            </Modal.Footer>
          </Modal>
        </>
      )}
    </div>
  );
};
