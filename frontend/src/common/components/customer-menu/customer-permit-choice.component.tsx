'use client';

import type { Asset } from '@common/interfaces/asset';
import { Button, Modal, RadioButton } from '@sk-web-gui/react';
import dayjs from 'dayjs';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const formatDate = (date?: string | null): string => (date ? dayjs(date).format('YYYY-MM-DD') : '');

const permitName = (permit: Asset): string => permit.title ?? permit.type ?? '';

/** Which permit a tillsyn is about, asked when the place has more than one in effect. */
export const CustomerPermitChoice: FC<{
  show: boolean;
  permits: Asset[];
  busy: boolean;
  onClose: () => void;
  onChoose: (permit: Asset) => void;
}> = ({ show, permits, busy, onClose, onChoose }) => {
  const { t } = useTranslation();
  const [chosenId, setChosenId] = useState<string>();
  const chosen = permits.find((permit) => permit.id === chosenId);

  const close = () => {
    setChosenId(undefined);
    onClose();
  };

  const confirm = () => {
    if (chosen) onChoose(chosen);
  };

  const validityOf = (permit: Asset): string => {
    const from = formatDate(permit.issued);
    const to = formatDate(permit.validTo);
    if (!from) return '';
    if (!to) return t('common:customer.overview.inspection.choose.validity_open', { from });
    return t('common:customer.overview.inspection.choose.validity', { from, to });
  };

  const detailsOf = (permit: Asset): string =>
    [permit.sourceErrandNumber, validityOf(permit)].filter(Boolean).join(', ');

  return (
    <Modal
      show={show}
      className="w-[42rem]"
      onClose={close}
      label={t('common:customer.overview.inspection.choose.title')}
    >
      <Modal.Content className="flex flex-col gap-16">
        <p className="m-0 text-dark-secondary">{t('common:customer.overview.inspection.choose.description')}</p>

        <RadioButton.Group>
          {permits.map((permit) => (
            <RadioButton
              key={permit.id}
              name="inspection-permit"
              id={`inspection-permit-${permit.id}`}
              value={permit.id}
              checked={permit.id === chosenId}
              disabled={busy}
              data-cy={`inspection-permit-${permit.id}`}
              onChange={() => setChosenId(permit.id)}
            >
              <span className="font-bold">{permitName(permit)}</span>
              <span className="block text-small text-dark-secondary">{detailsOf(permit)}</span>
            </RadioButton>
          ))}
        </RadioButton.Group>
      </Modal.Content>
      <Modal.Footer className="flex justify-end gap-16">
        <Button variant="secondary" disabled={busy} onClick={close} data-cy="inspection-permit-cancel">
          {t('common:customer.overview.inspection.choose.cancel')}
        </Button>
        <Button
          variant="primary"
          loading={busy}
          disabled={busy || !chosen}
          onClick={confirm}
          data-cy="inspection-permit-confirm"
        >
          {t('common:customer.overview.inspection.choose.confirm')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
