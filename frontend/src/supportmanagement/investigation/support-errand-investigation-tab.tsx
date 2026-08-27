'use client';

import { Alert, Spinner, Tabs } from '@sk-web-gui/react';
import { useSupportStore, useUserStore } from '@stores/index';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useCallback, useMemo, useState } from 'react';

import { useInvestigationProfileStore } from './investigation-profile-store';
import { type InvestigationTabState, resolveInvestigationTabState } from './investigation-tab-state';
import type { InvestigationTabProps } from './investigation-variant';
import { SupportInvestigationDocument } from './support-investigation-document.component';
import type { SupportInvestigationDocument as SavedInvestigationDocument } from './support-investigation-service';

const stateNotices: Readonly<Record<Exclude<InvestigationTabState, 'loading' | 'ready'>, string>> = {
  error: 'Utredningsprofilen kunde inte laddas. Utredningen kan därför inte visas.',
  unavailable: 'Utredningsfunktionen är tillfälligt otillgänglig. Försök igen senare.',
  'not-configured': 'Inga utredningsdokument är konfigurerade för den här applikationen.',
  'no-access': 'Du saknar läsbehörighet till utredningsdokumenten.',
};

export function SupportErrandInvestigationTab({ onDirtyChange }: Readonly<InvestigationTabProps>) {
  const [activeTab, setActiveTab] = useState(0);
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const canEditSupportManagement = useUserStore((state) => state.user.permissions.canEditSupportManagement);
  const profile = useInvestigationProfileStore((state) => state.profile);
  const profileStatus = useInvestigationProfileStore((state) => state.status);
  const readonly = !supportErrand || isSupportErrandLocked(supportErrand) || !canEditSupportManagement;

  const readableDocuments = useMemo(
    () => (profile?.documents ?? []).filter(({ permissions }) => permissions.canRead),
    [profile]
  );
  const tabState = resolveInvestigationTabState(profileStatus, profile, readableDocuments.length);

  const recordSavedDocument = useCallback(
    (document: SavedInvestigationDocument) => {
      useSupportStore.setState((state) => {
        if (!state.supportErrand || state.supportErrand.id !== supportErrand?.id) return state;

        return {
          supportErrand: {
            ...state.supportErrand,
            jsonParameters: [
              ...(state.supportErrand.jsonParameters ?? []).filter((parameter) => parameter.key !== document.key),
              document,
            ],
          },
        };
      });
    },
    [supportErrand?.id]
  );

  const dirtyCallbacks = useMemo(() => {
    const callbacks: Record<string, (isDirty: boolean) => void> = {};
    for (const { key } of readableDocuments) {
      callbacks[key] = (isDirty: boolean) => onDirtyChange(key, isDirty);
    }
    return callbacks;
  }, [onDirtyChange, readableDocuments]);

  return (
    <div className="min-w-0 max-w-full p-16 sm:p-24 md:p-32" data-cy="support-investigation-tab">
      <div className="mb-24">
        <h2 className="text-h2-md">Utredning</h2>
        <p className="mt-8">
          Dokumentera de olika delarna av utredningen. Varje del sparas separat och behåller sin schemaversion.
        </p>
      </div>

      {tabState === 'loading' ? (
        <div className="flex justify-center p-24" data-cy="investigation-tab-loading">
          <Spinner size={4} aria-label="Utredningen laddas" />
        </div>
      ) : null}

      {tabState !== 'loading' && tabState !== 'ready' ? (
        <Alert type={tabState === 'no-access' || tabState === 'not-configured' ? 'info' : 'warning'}>
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description data-cy={`investigation-tab-${tabState}`}>
              {stateNotices[tabState]}
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {tabState === 'ready' ? (
        <Tabs
          className="w-full min-w-0 max-w-full rounded-12 border-1 bg-background-content"
          tabslistClassName="flex-wrap px-16 pt-16"
          panelsClassName="min-w-0 max-w-full border-t-1"
          current={activeTab}
          onTabChange={setActiveTab}
          size="sm"
        >
          {readableDocuments.map((definition) => (
            <Tabs.Item key={definition.key}>
              <Tabs.Button data-cy={`${definition.key}-tab`}>{definition.tabLabel}</Tabs.Button>
              <Tabs.Content className="min-w-0 max-w-full">
                <SupportInvestigationDocument
                  definition={definition}
                  readonly={readonly || !definition.permissions.canWrite}
                  onDirtyChange={dirtyCallbacks[definition.key]}
                  onSaved={recordSavedDocument}
                />
              </Tabs.Content>
            </Tabs.Item>
          ))}
        </Tabs>
      ) : null}
    </div>
  );
}
