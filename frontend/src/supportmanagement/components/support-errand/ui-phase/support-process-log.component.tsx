'use client';

import type { ProcessActivity } from '@common/data-contracts/supportmanagement/data-contracts';
import { Button, Modal, Spinner } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore } from '@stores/index';
import { getSupportProcessActivities } from '@supportmanagement/services/support-process-service';
import dayjs from 'dayjs';
import { Info } from 'lucide-react';
import { FC, useState } from 'react';

const activityHeading = (activity: ProcessActivity): string =>
  activity.activityName || activity.activityId || activity.activityType;

const ProcessActivityRow: FC<{ activity: ProcessActivity }> = ({ activity }) => (
  <li className="border-b-1 last:border-b-0 py-8">
    <div className="flex justify-between gap-16">
      <span className="font-bold">{activityHeading(activity)}</span>
      <time dateTime={activity.occurredAt} className="text-small text-dark-secondary whitespace-nowrap">
        {dayjs(activity.occurredAt).format('YYYY-MM-DD HH:mm:ss')}
      </time>
    </div>
    {activity.message ? <p className="text-small my-0">{activity.message}</p> : null}
    <p className="text-small text-dark-secondary my-0">
      {[activity.activityType, activity.severity, activity.errorCode].filter(Boolean).join(' · ')}
    </p>
  </li>
);

export const SupportProcessLog = () => {
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activities, setActivities] = useState<ProcessActivity[]>([]);

  const open = () => {
    if (!supportErrand?.id) return;
    setIsOpen(true);
    setError(false);
    setIsLoading(true);
    getSupportProcessActivities(supportErrand.id, municipalityId)
      .then((result) => {
        setActivities(result);
        setIsLoading(false);
      })
      .catch(() => {
        setError(true);
        setIsLoading(false);
      });
  };

  return (
    <>
      <Button
        iconButton
        variant="tertiary"
        size="sm"
        showBackground={false}
        onClick={open}
        aria-label="Visa processloggen"
        title="Visa processloggen"
        data-cy="process-log-button"
      >
        <Info size={16} />
      </Button>
      <Modal show={isOpen} onClose={() => setIsOpen(false)} label="Processlogg" className="w-[48rem] max-w-full">
        <Modal.Content>
          {isLoading ? <Spinner size={3} aria-label="Hämtar processloggen" /> : null}
          {error ? <p>Processloggen kunde inte hämtas.</p> : null}
          {!isLoading && !error && activities.length === 0 ? <p>Processen har inte loggat något än.</p> : null}
          {!isLoading && !error && activities.length > 0 ? (
            <ul className="list-none p-0 m-0" data-cy="process-log-list">
              {activities.map((activity, index) => (
                <ProcessActivityRow key={activity.id ?? `${activity.occurredAt}-${index}`} activity={activity} />
              ))}
            </ul>
          ) : null}
        </Modal.Content>
      </Modal>
    </>
  );
};
