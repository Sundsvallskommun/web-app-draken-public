import { Disclosure, FormControl, FormLabel, Select, Textarea } from '@sk-web-gui/react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { DecisionOutcome } from '../../../../../common/data-contracts/supportmanagement/data-contracts';

export const InvestigationConclusionDisclosure: FC<{
  values: {
    summary: string;
    conclusion: string;
    recommendation: string;
    recommendationMotivation: string;
  };
  readOnly: boolean;
  set: (key: 'summary' | 'conclusion' | 'recommendation' | 'recommendationMotivation', value: string) => void;
  outcomes: DecisionOutcome[];
}> = ({ values, readOnly, set, outcomes }) => {
  const { t } = useTranslation();

  return (
    <Disclosure variant="alt" className="w-full" data-cy="investigation-conclusion-section">
      <Disclosure.Header>
        <Disclosure.Title>{t('common:investigation.conclusion_heading')}</Disclosure.Title>
        <Disclosure.Button />
      </Disclosure.Header>
      <Disclosure.Content>
        <div className="flex flex-col gap-16">
          <FormControl id="investigation-summary" className="w-full">
            <FormLabel>{t('common:investigation.summary')}</FormLabel>
            <Textarea
              className="w-full"
              rows={3}
              value={values.summary}
              disabled={readOnly}
              onChange={(event) => set('summary', event.target.value)}
              data-cy="investigation-summary"
            />
          </FormControl>

          <FormControl id="investigation-conclusion" className="w-full">
            <FormLabel>{t('common:investigation.conclusion')}</FormLabel>
            <Textarea
              className="w-full"
              rows={3}
              value={values.conclusion}
              disabled={readOnly}
              onChange={(event) => set('conclusion', event.target.value)}
              data-cy="investigation-conclusion"
            />
          </FormControl>

          <FormControl id="investigation-recommendation" className="w-full max-w-[32rem]">
            <FormLabel>{t('common:investigation.recommendation')}</FormLabel>
            <Select
              className="w-full"
              value={values.recommendation}
              disabled={readOnly}
              onChange={(event) => set('recommendation', event.target.value)}
              data-cy="investigation-recommendation"
            >
              <Select.Option value="">{t('common:investigation.recommendation_placeholder')}</Select.Option>
              {outcomes.map((outcome) => (
                <Select.Option key={outcome.name} value={outcome.name}>
                  {outcome.displayName || outcome.name}
                </Select.Option>
              ))}
            </Select>
          </FormControl>

          <FormControl id="investigation-motivation" className="w-full">
            <FormLabel>{t('common:investigation.recommendation_motivation')}</FormLabel>
            <Textarea
              className="w-full"
              rows={3}
              value={values.recommendationMotivation}
              disabled={readOnly}
              onChange={(event) => set('recommendationMotivation', event.target.value)}
              data-cy="investigation-motivation"
            />
          </FormControl>
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};
