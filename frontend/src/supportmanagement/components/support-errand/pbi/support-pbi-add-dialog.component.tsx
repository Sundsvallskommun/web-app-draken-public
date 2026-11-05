'use client';

import { searchPerson } from '@common/services/adress-service';
import { invalidSsnMessage } from '@common/services/helper-service';
import { Button, FormControl, FormErrorMessage, FormLabel, Input, Modal } from '@sk-web-gui/react';
import {
  normalizeIdentity,
  PBI_ROLE_MAX_LENGTH,
  PbiPersonToAdd,
  stakeholderName,
} from '@supportmanagement/services/support-pbi-service';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FoundPerson = Omit<PbiPersonToAdd, 'role'>;

/**
 * Names a person the company data does not offer. The personal number is looked up in Citizen for the party id
 * and the name; the stakeholder that is added carries the party id, and the personal number only the way every
 * stakeholder on the errand does.
 */
export const SupportPbiAddDialog: FC<{
  show: boolean;
  onClose: () => void;
  onAdd: (person: PbiPersonToAdd) => Promise<boolean>;
}> = ({ show, onClose, onAdd }) => {
  const { t } = useTranslation();
  const [identityCode, setIdentityCode] = useState('');
  const [role, setRole] = useState('');
  const [found, setFound] = useState<FoundPerson>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setIdentityCode('');
    setRole('');
    setFound(undefined);
    setProblem(undefined);
    onClose();
  };

  const look = async () => {
    setProblem(undefined);
    setFound(undefined);

    const personNumber = normalizeIdentity(identityCode);
    if (personNumber.length !== 12) {
      setProblem(invalidSsnMessage);
      return;
    }

    setBusy(true);
    try {
      const person = await searchPerson(personNumber);
      if (!person?.personId) {
        setProblem(t('common:company.pbi.add.not_found'));
        return;
      }
      setFound({
        partyId: person.personId,
        firstName: person.firstName ?? '',
        lastName: person.lastName ?? '',
        personNumber,
      });
    } catch {
      setProblem(t('common:company.pbi.add.not_found'));
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!found) return;
    setBusy(true);
    const added = await onAdd({ ...found, role: role.trim() || undefined });
    setBusy(false);
    if (added) close();
  };

  return (
    <Modal show={show} className="w-[42rem]" onClose={close} label={t('common:company.pbi.add.title')}>
      <Modal.Content className="flex flex-col gap-16">
        <p className="m-0 text-dark-secondary">{t('common:company.pbi.add.description')}</p>

        <FormControl className="w-full" invalid={!!problem}>
          <FormLabel>{t('common:company.pbi.add.identity')}</FormLabel>
          <Input
            value={identityCode}
            disabled={busy || !!found}
            placeholder={t('common:company.pbi.add.identity_placeholder')}
            data-cy="pbi-add-identity"
            onChange={(e) => {
              setIdentityCode(e.currentTarget.value);
              setFound(undefined);
              setProblem(undefined);
            }}
          />
          {problem ? <FormErrorMessage data-cy="pbi-add-problem">{problem}</FormErrorMessage> : null}
        </FormControl>

        {found ? (
          <>
            <div className="border-1 rounded-groups p-16" data-cy="pbi-add-found">
              <span className="font-semibold">{stakeholderName(found)}</span>
            </div>
            <FormControl className="w-full">
              <FormLabel>{t('common:company.pbi.add.role')}</FormLabel>
              <Input
                value={role}
                disabled={busy}
                maxLength={PBI_ROLE_MAX_LENGTH}
                placeholder={t('common:company.pbi.add.role_placeholder')}
                data-cy="pbi-add-role"
                onChange={(e) => setRole(e.currentTarget.value)}
              />
            </FormControl>
          </>
        ) : null}
      </Modal.Content>
      <Modal.Footer className="flex justify-end gap-16">
        <Button variant="secondary" disabled={busy} onClick={close} data-cy="pbi-add-cancel">
          {t('common:company.pbi.add.cancel')}
        </Button>
        {found ? (
          <Button variant="primary" loading={busy} disabled={busy} onClick={add} data-cy="pbi-add-confirm">
            {t('common:company.pbi.add.confirm')}
          </Button>
        ) : (
          <Button
            variant="primary"
            loading={busy}
            disabled={busy || !identityCode}
            onClick={look}
            data-cy="pbi-add-search"
          >
            {t('common:company.pbi.add.search')}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
