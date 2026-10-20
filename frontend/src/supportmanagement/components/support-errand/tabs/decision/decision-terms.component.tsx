import { Button, FormLabel, Input } from '@sk-web-gui/react';
import { Plus, Trash } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

/** The conditions of the decision, one row each; the process turns them into the permit's conditions. */
export const DecisionTerms: FC<{
  terms: string[];
  onChange: (terms: string[]) => void;
  disabled: boolean;
}> = ({ terms, onChange, disabled }) => {
  const { t } = useTranslation();

  const write = (index: number, value: string) =>
    onChange(terms.map((term, position) => (position === index ? value : term)));

  return (
    <div className="flex flex-col items-start gap-8">
      <FormLabel>{t('common:decision.terms')}</FormLabel>
      {terms.map((term, index) => (
        <div key={`term-${index}`} className="flex gap-8 items-center w-full">
          <Input
            className="w-full"
            value={term}
            onChange={(event) => write(index, event.target.value)}
            disabled={disabled}
            aria-label={t('common:decision.term_label', { number: index + 1 })}
          />
          <Button
            iconButton
            variant="tertiary"
            showBackground={false}
            onClick={() => onChange(terms.filter((_, position) => position !== index))}
            disabled={disabled}
            aria-label={t('common:decision.remove_term', { number: index + 1 })}
          >
            <Trash size={16} />
          </Button>
        </div>
      ))}
      <Button
        variant="tertiary"
        size="sm"
        leftIcon={<Plus size={16} />}
        onClick={() => onChange([...terms, ''])}
        disabled={disabled}
        data-cy="decision-add-term"
      >
        {t('common:decision.add_term')}
      </Button>
    </div>
  );
};
