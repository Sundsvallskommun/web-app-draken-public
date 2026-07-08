import { Avatar, Button } from '@sk-web-gui/react';
import { FC, ReactNode } from 'react';

export interface StakeholderCardDetail {
  value?: string | null;
  dataCy?: string;
}

export interface StakeholderCardContact {
  name?: string;
  initials?: string;
  partyNumber?: string;
  partyNumberPlaceholder?: string;
  identityDetails?: StakeholderCardDetail[];
  address?: string;
  phoneNumbers: string[];
  emails: string[];
  username?: string;
}

export interface StakeholderCardAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  dataCy?: string;
}

interface StakeholderCardProps {
  header?: string;
  headerSuffix?: string;
  contact: StakeholderCardContact;
  actions?: StakeholderCardAction[];
  index?: number;
  dataCy?: string;
  editForm?: ReactNode;
  footer?: ReactNode;
  onAddPhone?: () => void;
  onAddEmail?: () => void;
  addDisabled?: boolean;
}

const avatarColors = ['vattjom', 'juniskar', 'gronsta', 'bjornstigen'] as const;

export const StakeholderCard: FC<StakeholderCardProps> = ({
  header,
  headerSuffix,
  contact,
  actions = [],
  index = 0,
  dataCy,
  editForm,
  footer,
  onAddPhone,
  onAddEmail,
  addDisabled,
}) => {
  const identityDetails = contact.identityDetails?.filter((detail) => detail.value) ?? [];

  return (
    <div data-cy={dataCy} className="w-full bg-background-content border rounded-button">
      {editForm}

      <div className="bg-vattjom-background-200 px-16 py-8 flex justify-between rounded-t-button">
        <div className="font-bold text-small">
          {header}
          {headerSuffix ? ` (${headerSuffix})` : ''}
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-16 text-small">
            {actions.map((action) => (
              <Button
                key={action.label}
                disabled={action.disabled}
                data-cy={action.dataCy}
                variant="link"
                className="text-body"
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="md:flex md:gap-24 px-16 py-12">
        <div className={`md:w-1/3 flex gap-8 break-all ${identityDetails.length > 0 ? 'items-start' : 'items-center'}`}>
          <Avatar
            rounded
            color={avatarColors[index % avatarColors.length]}
            size="sm"
            initials={contact.initials || '?'}
          />
          <div>
            {contact.name ? (
              <p className="my-xs mt-0 text-small" data-cy="stakeholder-name">
                <strong>{contact.name}</strong>
              </p>
            ) : null}
            <p
              className={`my-xs mt-0 flex flex-col text-small ${contact.partyNumber ? '' : 'text-dark-disabled'}`}
              data-cy="stakeholder-ssn"
            >
              {contact.partyNumber || contact.partyNumberPlaceholder}
            </p>
            {identityDetails.map((detail) => (
              <p
                key={detail.dataCy ?? detail.value}
                className="my-xs mt-0 flex flex-col text-small"
                data-cy={detail.dataCy}
              >
                {detail.value}
              </p>
            ))}
          </div>
        </div>
        <div className="md:w-1/3 md:mt-0 mt-md break-all">
          <p
            className={`my-xs mt-0 text-small ${contact.address ? '' : 'text-dark-disabled'}`}
            data-cy="stakeholder-adress"
          >
            {contact.address || '(adress saknas)'}
          </p>
        </div>
        <div className="md:w-1/3 md:mt-0 mt-md text-small">
          <div data-cy="stakeholder-phone">
            {contact.phoneNumbers.join(', ') ||
              (onAddPhone ? (
                <Button disabled={addDisabled} color="vattjom" variant="link" onClick={onAddPhone}>
                  Lägg till telefonnummer
                </Button>
              ) : null)}
          </div>
          <div data-cy="stakeholder-email">
            {contact.emails.join(', ') ||
              (onAddEmail ? (
                <Button disabled={addDisabled} color="vattjom" variant="link" onClick={onAddEmail}>
                  Lägg till e-post
                </Button>
              ) : null)}
          </div>
          {contact.username ? (
            <div className="my-xs mt-0" data-cy="stakeholder-username">
              <p className="flex flex-col">{contact.username}</p>
            </div>
          ) : null}
        </div>
      </div>

      {footer}
    </div>
  );
};
