import { DecisionOutcome } from '@common/data-contracts/supportmanagement/data-contracts';
import { Disclosure, FormControl, FormLabel, Select } from '@sk-web-gui/react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { InvestigationTextEditor } from '../../investigation-text-editor.component';

export const InvestigationConclusionDisclosure: FC<{
  values: {
    conclusion: string;
    recommendation: string;
    recommendationMotivation: string;
  };
  readOnly: boolean;
  set: (key: 'conclusion' | 'recommendation' | 'recommendationMotivation', value: string) => void;
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
        <div className="flex flex-col gap-24">
          <InvestigationTextEditor
            name="investigation-conclusion"
            labelKey="common:investigation.conclusion"
            placeholderKey="common:investigation.conclusion_placeholder"
            value={values.conclusion}
            readOnly={readOnly}
            onChange={(markup) => set('conclusion', markup)}
          />

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

          <InvestigationTextEditor
            name="investigation-motivation"
            labelKey="common:investigation.recommendation_motivation"
            placeholderKey="common:investigation.recommendation_motivation_placeholder"
            value={values.recommendationMotivation}
            readOnly={readOnly}
            onChange={(markup) => set('recommendationMotivation', markup)}
          />
        </div>
      </Disclosure.Content>
    </Disclosure>
  );
};
