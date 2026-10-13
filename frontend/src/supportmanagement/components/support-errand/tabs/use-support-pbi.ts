import { searchPerson } from '@common/services/adress-service';
import { engagementRoles, getLegalEntityEngagements } from '@common/services/legal-entity-service';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { useSnackbar } from '@sk-web-gui/react';
import { useSupportStore, useUserStore } from '@stores/index';
import {
  isSupportErrandLocked,
  SupportErrand,
  SupportStakeholderFormModel,
} from '@supportmanagement/services/support-errand-service';
import {
  existsOnlyAsPbi,
  newPbiContact,
  pbiCandidates,
  pbiPeople,
  PbiPersonToAdd,
  PbiSource,
  sameIdentity,
  SupportPbiCandidate,
  withoutPbi,
  withPbi,
} from '@supportmanagement/services/support-pbi-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { LegalEntityEngagement } from 'src/data-contracts/backend/data-contracts';

/**
 * The people of significant influence are stakeholders in the form. This hook reads them off the form, lays the
 * company engagements beside them, and writes every marking back into the form, so Spara ärende saves it like any
 * other change. Nothing here talks to the errand directly.
 */
export const useSupportPbi = (organizationPartyId: string | undefined) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const setStakeholderContacts = useSupportStore((s) => s.setStakeholderContacts);
  const setStakeholderCustomers = useSupportStore((s) => s.setStakeholderCustomers);
  const canEditErrand = useUserStore((s) => s.user.permissions?.canEditSupportManagement);
  const { watch, setValue } = useFormContext<SupportErrand>();
  const [engagements, setEngagements] = useState<LegalEntityEngagement[]>([]);
  const [busyIdentity, setBusyIdentity] = useState<string>();

  const watchedCustomer = watch('customer');
  const watchedContacts = watch('contacts');
  const customer: SupportStakeholderFormModel[] = useMemo(() => watchedCustomer ?? [], [watchedCustomer]);
  const contacts: SupportStakeholderFormModel[] = useMemo(() => watchedContacts ?? [], [watchedContacts]);

  useEffect(() => {
    if (!organizationPartyId) {
      setEngagements([]);
      return undefined;
    }
    let active = true;
    getLegalEntityEngagements(organizationPartyId)
      .then((read) => {
        if (active) setEngagements(read);
      })
      .catch(() => {
        if (active) setEngagements([]);
      });
    return () => {
      active = false;
    };
  }, [organizationPartyId]);

  /** Both the form and the store's copy, which the contact cards render from and the contact form appends to. */
  const write = useCallback(
    (nextCustomer: SupportStakeholderFormModel[], nextContacts: SupportStakeholderFormModel[]) => {
      setValue('customer', nextCustomer, { shouldDirty: true, shouldValidate: true });
      setValue('contacts', nextContacts, { shouldDirty: true, shouldValidate: true });
      setStakeholderCustomers(nextCustomer);
      setStakeholderContacts(nextContacts);
    },
    [setStakeholderContacts, setStakeholderCustomers, setValue]
  );

  const replace = useCallback(
    (updated: SupportStakeholderFormModel) =>
      write(
        customer.map((s) => (s.internalId === updated.internalId ? updated : s)),
        contacts.map((s) => (s.internalId === updated.internalId ? updated : s))
      ),
    [contacts, customer, write]
  );

  const remove = useCallback(
    (gone: SupportStakeholderFormModel) =>
      write(
        customer.filter((s) => s.internalId !== gone.internalId),
        contacts.filter((s) => s.internalId !== gone.internalId)
      ),
    [contacts, customer, write]
  );

  const complainNotFound = useCallback(
    () => toastMessage(getToastOptions({ message: t('common:company.pbi.add.not_found'), status: 'error' })),
    [t, toastMessage]
  );

  /** A person from the company data: already a stakeholder, or looked up in Citizen and added as one. */
  const mark = useCallback(
    async (candidate: SupportPbiCandidate): Promise<boolean> => {
      const role = engagementRoles(candidate.engagement);
      if (candidate.stakeholder) {
        replace(withPbi(candidate.stakeholder, { role }));
        return true;
      }
      const code = candidate.engagement.identity?.code ?? '';
      setBusyIdentity(code);
      try {
        const person = await searchPerson(code);
        if (!person?.personId) {
          complainNotFound();
          return false;
        }
        write(customer, [
          ...contacts,
          newPbiContact(
            {
              partyId: person.personId,
              firstName: person.firstName ?? '',
              lastName: person.lastName ?? '',
              personNumber: code,
              role,
            },
            PbiSource.COMPANY
          ),
        ]);
        return true;
      } catch {
        complainNotFound();
        return false;
      } finally {
        setBusyIdentity(undefined);
      }
    },
    [complainNotFound, contacts, customer, replace, write]
  );

  /** A stakeholder that was there before the marking keeps their place; one that was not leaves with it. */
  const unmark = useCallback(
    (stakeholder: SupportStakeholderFormModel) => {
      if (existsOnlyAsPbi(stakeholder)) remove(stakeholder);
      else replace(withoutPbi(stakeholder));
    },
    [remove, replace]
  );

  const addByHand = useCallback(
    async (person: PbiPersonToAdd): Promise<boolean> => {
      const existing = [...customer, ...contacts].find((s) => sameIdentity(s.personNumber, person.personNumber));
      if (existing) replace(withPbi(existing, { role: person.role }));
      else write(customer, [...contacts, newPbiContact(person, PbiSource.MANUAL)]);
      return true;
    },
    [contacts, customer, replace, write]
  );

  return {
    engagements,
    candidates: pbiCandidates(engagements, [...customer, ...contacts]),
    people: pbiPeople(customer, contacts),
    canEdit: !!canEditErrand && !!supportErrand && !isSupportErrandLocked(supportErrand),
    busyIdentity,
    mark,
    unmark,
    addByHand,
    replace,
  };
};
