'use client';

import type { Statement } from '@common/data-contracts/supportmanagement/data-contracts';
import { getToastOptions } from '@common/utils/toast-message-settings';
import { Button, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useConfigStore, useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import {
  getSupportStatements,
  supportStatementEdited,
  supportStatementFields,
  type SupportStatementForm,
  supportStatementForm,
  supportStatementProblem,
  updateSupportStatement,
} from '@supportmanagement/services/support-statement-service';
import { Plus } from 'lucide-react';
import { FC, MutableRefObject, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SupportStatementCard } from './support-statement-card.component';

/**
 * A card the handler has opened. It carries no statement until a counterparty has been chosen, since
 * that is the one thing the service insists on having before a statement can exist at all.
 */
interface StatementCard {
  key: string;
  statement: Statement;
  form: SupportStatementForm;
}

const cardOf = (statement: Statement): StatementCard => ({
  key: statement.id ?? '',
  statement,
  form: supportStatementForm(statement),
});

const oldestFirst = (statements: Statement[]): Statement[] =>
  [...statements].sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''));

const isWritten = (card: StatementCard): boolean => Boolean(card.statement.id);

export const SupportStatementsSection: FC<{
  writable: boolean;
  onEdited: (edited: boolean) => void;
  saveRef: MutableRefObject<(() => Promise<boolean>) | undefined>;
}> = ({ writable, onEdited, saveRef }) => {
  const { t } = useTranslation();
  const toastMessage = useSnackbar();
  const municipalityId = useConfigStore((s) => s.municipalityId);
  const supportErrand = useSupportStore((s) => s.supportErrand);
  const supportMetadata = useMetadataStore((s) => s.supportMetadata);
  const canEdit = useUserStore((s) => s.user.permissions?.canEditSupportManagement);

  const [cards, setCards] = useState<StatementCard[]>([]);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const errandId = supportErrand?.id ?? '';
  const errandNumber = supportErrand?.errandNumber ?? '';

  useEffect(() => {
    if (!errandId || !municipalityId) return;

    let reading = true;
    getSupportStatements(errandId, municipalityId)
      .then((result) => {
        if (reading) setCards(oldestFirst(result).map(cardOf));
      })
      .catch(() => {
        if (reading) {
          toastMessage(getToastOptions({ message: t('common:statements.toast.read_failed'), status: 'error' }));
        }
      })
      .finally(() => {
        if (reading) setLoading(false);
      });

    return () => {
      reading = false;
    };
  }, [errandId, municipalityId, t, toastMessage]);

  const edited = useMemo(
    () => cards.some((card) => isWritten(card) && supportStatementEdited(card.form, card.statement)),
    [cards]
  );

  useEffect(() => {
    onEdited(edited);
  }, [edited, onEdited]);

  const titleOf = useCallback(
    (form: SupportStatementForm) =>
      t('common:statements.attachment_title', { counterparty: form.counterpartyName, errandNumber }),
    [errandNumber, t]
  );

  /**
   * Saves every statement the handler has changed, as part of saving the investigation. Nothing is
   * written when one of them is incomplete: the whole section is pointed out at once rather than
   * leaving half the statements saved.
   */
  const saveAll = useCallback(async (): Promise<boolean> => {
    const toSave = cards.filter((card) => isWritten(card) && supportStatementEdited(card.form, card.statement));
    if (toSave.length === 0) return true;

    const found: Record<string, string> = {};
    for (const card of toSave) {
      const problem = supportStatementProblem(card.form, card.statement, supportMetadata);
      if (problem) found[card.key] = problem;
    }
    setProblems(found);
    if (Object.keys(found).length > 0) {
      toastMessage(getToastOptions({ message: t('common:statements.toast.incomplete'), status: 'error' }));
      return false;
    }

    try {
      const saved = await Promise.all(
        toSave.map((card) =>
          updateSupportStatement(
            errandId,
            municipalityId,
            card.statement.id ?? '',
            supportStatementFields(card.form, titleOf(card.form))
          )
        )
      );
      setCards((current) =>
        current.map((card) => {
          const result = saved.find((statement) => statement.id === card.statement.id);
          return result ? { ...card, statement: result, form: supportStatementForm(result) } : card;
        })
      );
      return true;
    } catch {
      toastMessage(getToastOptions({ message: t('common:statements.toast.save_failed'), status: 'error' }));
      return false;
    }
  }, [cards, errandId, municipalityId, supportMetadata, t, titleOf, toastMessage]);

  useEffect(() => {
    saveRef.current = saveAll;
  }, [saveAll, saveRef]);

  const add = () =>
    setCards((current) => [...current, { key: `new-${Date.now()}`, statement: {}, form: supportStatementForm({}) }]);

  const change = (key: string, changes: Partial<SupportStatementForm>) => {
    setProblems((current) => ({ ...current, [key]: '' }));
    setCards((current) =>
      current.map((card) => (card.key === key ? { ...card, form: { ...card.form, ...changes } } : card))
    );
  };

  const replace = (key: string, statement: Statement) =>
    setCards((current) =>
      current.map((card) =>
        card.key === key
          ? { key: statement.id ?? card.key, statement, form: { ...supportStatementForm(statement) } }
          : card
      )
    );

  const forget = (key: string) => setCards((current) => current.filter((card) => card.key !== key));

  const mayEdit = writable && canEdit === true;

  return (
    <div className="flex flex-col gap-16" data-cy="statements-section">
      <p className="text-dark-secondary m-0">{t('common:statements.description')}</p>

      {loading ? <Spinner size={2} aria-label={t('common:statements.loading')} /> : null}

      {!loading && cards.length === 0 ? (
        <p
          className="text-dark-secondary text-center border-1 border-dashed rounded-groups py-24 m-0"
          data-cy="statements-empty"
        >
          {t('common:statements.empty')}
        </p>
      ) : null}

      {!loading
        ? cards.map((card) => (
            <SupportStatementCard
              key={card.key}
              statement={card.statement}
              form={card.form}
              problem={problems[card.key] || undefined}
              errandId={errandId}
              errandNumber={errandNumber}
              municipalityId={municipalityId}
              writable={mayEdit}
              onFormChange={(changes) => change(card.key, changes)}
              onChanged={(statement) => replace(card.key, statement)}
              onRemoved={() => forget(card.key)}
            />
          ))
        : null}

      <div>
        <Button
          type="button"
          variant="primary"
          disabled={!mayEdit}
          data-cy="statements-add"
          leftIcon={<Plus size={18} />}
          onClick={add}
        >
          {t('common:statements.add')}
        </Button>
      </div>
    </div>
  );
};
