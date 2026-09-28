'use client';

import { SegmentedControl } from '@sk-web-gui/react';
import { FC, useState } from 'react';

export const customerTabs = [
  { id: 'oversikt', label: 'Översikt' },
  { id: 'arenden', label: 'Ärenden' },
  { id: 'tillstand', label: 'Tillstånd' },
  { id: 'anmalan', label: 'Anmälan' },
  { id: 'handelser', label: 'Händelser' },
] as const;

export type CustomerTabId = (typeof customerTabs)[number]['id'];

/**
 * Tab bar for the customer view. Tab state is local; the route stops at the customer id.
 */
export const CustomerTabs: FC = () => {
  const [selected, setSelected] = useState<number>(0);
  const activeTab = customerTabs[selected];

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
        aria-label="Kundvy"
        data-cy="customer-tabs"
      >
        {customerTabs.map((tab) => (
          <SegmentedControl.Item key={tab.id}>
            <button type="button" data-cy={`customer-tab-${tab.id}`}>
              {tab.label}
            </button>
          </SegmentedControl.Item>
        ))}
      </SegmentedControl>

      {/* Placeholder until the tab contents are built. */}
      <section aria-label={activeTab.label} data-cy={`customer-tab-content-${activeTab.id}`}>
        <p className="m-0 text-dark-secondary">{activeTab.label} kommer att visas här.</p>
      </section>
    </div>
  );
};
