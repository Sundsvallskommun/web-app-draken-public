import { PriorityComponent } from '@common/components/priority/priority.component';
import { prettyTime } from '@common/services/helper-service';
import { useAppContext } from '@contexts/app.context';
import { Priority } from '@supportmanagement/interfaces/priority';
import { Channels } from '@supportmanagement/services/support-errand-service';
import { getSupportReporterStakeholder } from '@supportmanagement/services/support-stakeholder-service';
import { SupportStatusLabelComponent } from '../ongoing-support-errands/components/support-status-label.component';

export const SupportErrandSummary: React.FC<{}> = () => {
  const { supportErrand } = useAppContext();

  return (
    <>
      <div className="rounded-cards">
        <div className="flex gap-x-32 gap-y-8 bg-background-content rounded-button p-md border">
          <div className="pr-sm">
            <div data-cy="errandStatusLabel" className="font-bold">
              Ärendestatus
            </div>
            <div data-cy="errandStatus">
              <SupportStatusLabelComponent status={supportErrand.status} resolution={supportErrand.resolution} />
            </div>
          </div>
          <div className="pr-sm">
            <div className="font-bold" data-cy="errandPriorityLabel">
              Prioritet
            </div>
            <div>
              <span className="flex gap-sm items-center">
                <PriorityComponent priority={Priority[supportErrand?.priority]} />
              </span>
            </div>
          </div>

          <div className="pr-sm">
            <div data-cy="errandRegisteredLabel" className="font-bold">
              Inkom via {Channels[supportErrand.channel].toLowerCase()}
            </div>
            <div data-cy="errandRegistered">{prettyTime(supportErrand?.created)}</div>
          </div>
          <div className="pr-sm">
            <div className="font-bold" data-cy="errandStakeholderLabel">
              Rapportör
            </div>
            <div className="underline" data-cy="errandStakeholder">
              {(() => {
                const reporter = getSupportReporterStakeholder(supportErrand);
                if (reporter?.firstName && reporter?.lastName) {
                  return `${reporter.firstName} ${reporter.lastName}`;
                } else {
                  return '(saknas)';
                }
              })()}
            </div>
          </div>
          <div className="pr-sm">
            <div data-cy="errandRegisteredLabel" className="font-bold">
              Kommun
            </div>
            <div data-cy="errandRegistered">Sundsvalls kommun</div>
          </div>
        </div>
      </div>
    </>
  );
};
