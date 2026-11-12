'use client';

import { CustomerErrands } from '@common/components/customer-menu/customer-errands.component';
import { PermitAssetsTable } from '@common/components/customer-menu/permit-assets-table.component';
import { useCustomerLookup } from '@common/components/customer-menu/use-customer-lookup';
import { getPermitAssetTypes } from '@common/services/customer-service';
import { SegmentedControl } from '@sk-web-gui/react';
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

const listTabs = ['kundlista', 'tillstandslista'] as const;

export const CustomerListTabs: FC = () => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<number>(0);
  // An app without permit types gets no permit list, and so no tabs.
  const permitTypesLookup = useCustomerLookup('permit-asset-types', getPermitAssetTypes);
  const permitTypes = permitTypesLookup.status === 'done' ? permitTypesLookup.data : [];
  const showTabs = permitTypes.length > 0;
  const activeTab = showTabs ? listTabs[selected] : 'kundlista';
  const label = (tab: (typeof listTabs)[number]) => t(`common:customer.list.tabs.${tab}`);

  return (
    <div className="flex flex-col gap-24">
      {showTabs && (
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
      )}

      <section aria-label={label(activeTab)} data-cy={`customer-list-tab-content-${activeTab}`}>
        {activeTab === 'kundlista' ? <CustomerErrands /> : <PermitAssetsTable permitTypes={permitTypes} />}
      </section>
    </div>
  );
};
