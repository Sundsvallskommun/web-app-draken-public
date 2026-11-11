'use client';

import { CustomerErrands } from '@common/components/customer-menu/customer-errands.component';
import { PermitAssetsTable } from '@common/components/customer-menu/permit-assets-table.component';
import { SegmentedControl } from '@sk-web-gui/react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const listTabs = ['kundlista', 'tillstandslista'] as const;

export const CustomerListTabs: FC = () => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number>(0);
  const activeTab = listTabs[selected];
  const label = (tab: (typeof listTabs)[number]) => t(`common:customer.list.tabs.${tab}`);

  return (
    <div className="flex flex-col gap-24">
      <SegmentedControl
        value={[selected]}
        onChange={(indices) => {
          if (indices.length > 0) {
            setSelected(indices[0]);
          }
        }}
        className="w-full !max-w-full"
        aria-label={t('common:customer.list.tabs.label')}
        data-cy="customer-list-tabs"
      >
        {listTabs.map((tab) => (
          <SegmentedControl.Item key={tab}>
            <button type="button" data-cy={`customer-list-tab-${tab}`}>
              {label(tab)}
            </button>
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      <section aria-label={label(activeTab)} data-cy={`customer-list-tab-content-${activeTab}`}>
        {activeTab === 'kundlista' ? <CustomerErrands /> : <PermitAssetsTable />}
      </section>
    </div>
  );
};
