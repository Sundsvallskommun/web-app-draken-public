'use client';

import { Button, FormControl, FormLabel, Input } from '@sk-web-gui/react';
import {
  emptySupportPremisesPreviousPermit,
  type SupportPremisesPreviousPermit,
} from '@supportmanagement/services/support-premises-examination-service';
import { Plus, Trash2 } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

interface PreviousPermitsProps {
  permits: SupportPremisesPreviousPermit[];
  writable: boolean;
  onChange: (update: (permits: SupportPremisesPreviousPermit[]) => SupportPremisesPreviousPermit[]) => void;
}

export const PreviousPermits: FC<PreviousPermitsProps> = ({ permits, writable, onChange }) => {
  const { t } = useTranslation();

  const change = (index: number, changes: Partial<SupportPremisesPreviousPermit>) =>
    onChange((stored) => stored.map((permit, candidate) => (candidate === index ? { ...permit, ...changes } : permit)));

  const remove = (index: number) => onChange((stored) => stored.filter((_, candidate) => candidate !== index));

  const add = () => onChange((stored) => [...stored, emptySupportPremisesPreviousPermit()]);

  return (
    <div className="flex flex-col gap-12" data-cy="premises-previous-permits">
      <div>
        <p className="text-small font-bold text-dark-secondary m-0">{t('common:premises.previous_permits.label')}</p>
        <p className="text-small text-dark-secondary m-0">{t('common:premises.previous_permits.description')}</p>
      </div>

      {permits.length === 0 ? (
        <p className="text-small text-dark-secondary m-0" data-cy="premises-previous-permits-empty">
          {t('common:premises.previous_permits.empty')}
        </p>
      ) : null}

      {permits.map((permit, index) => {
        const number = index + 1;
        const cy = (part: string) => `premises-previous-permit-${part}-${number}`;
        return (
          <div key={number} className="flex items-end gap-16 flex-wrap" data-cy={cy('row')}>
            <FormControl className="grow basis-[22rem]">
              <FormLabel>{t('common:premises.previous_permits.holder')}</FormLabel>
              <Input
                value={permit.holderName}
                disabled={!writable}
                data-cy={cy('holder')}
                placeholder={t('common:premises.previous_permits.holder_placeholder')}
                onChange={(event) => change(index, { holderName: event.currentTarget.value })}
              />
            </FormControl>

            <FormControl className="w-[16rem]">
              <FormLabel>{t('common:premises.previous_permits.valid_from')}</FormLabel>
              <Input
                type="date"
                value={permit.validFrom}
                disabled={!writable}
                data-cy={cy('from')}
                onChange={(event) => change(index, { validFrom: event.currentTarget.value })}
              />
            </FormControl>

            <FormControl className="w-[16rem]">
              <FormLabel>{t('common:premises.previous_permits.valid_to')}</FormLabel>
              <Input
                type="date"
                value={permit.validTo}
                disabled={!writable}
                data-cy={cy('to')}
                onChange={(event) => change(index, { validTo: event.currentTarget.value })}
              />
            </FormControl>

            <Button
              type="button"
              iconButton
              variant="tertiary"
              color="error"
              disabled={!writable}
              aria-label={t('common:premises.previous_permits.remove', { number })}
              title={t('common:premises.previous_permits.remove', { number })}
              data-cy={cy('remove')}
              onClick={() => remove(index)}
            >
              <Trash2 size={20} />
            </Button>
          </div>
        );
      })}

      <div>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          disabled={!writable}
          leftIcon={<Plus size={18} />}
          data-cy="premises-previous-permit-add"
          onClick={add}
        >
          {t('common:premises.previous_permits.add')}
        </Button>
      </div>
    </div>
  );
};
