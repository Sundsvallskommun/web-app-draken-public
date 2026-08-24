'use client';

import { Alert, Tabs } from '@sk-web-gui/react';
import { useSupportStore, useUserStore } from '@stores/index';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useCallback, useMemo, useState } from 'react';

import type { InvestigationDocumentDefinition, InvestigationDocumentKey } from './investigation-document';
import { SupportInvestigationDocument } from './support-investigation-document.component';
import type { SupportInvestigationDocument as SavedInvestigationDocument } from './support-investigation-service';

interface SupportErrandInvestigationTabProps {
  documents: readonly InvestigationDocumentDefinition[];
  onDirtyChange: (key: InvestigationDocumentKey, isDirty: boolean) => void;
}

export function SupportErrandInvestigationTab({
  documents,
  onDirtyChange,
}: Readonly<SupportErrandInvestigationTabProps>) {
  const [activeTab, setActiveTab] = useState(0);
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const canEditSupportManagement = useUserStore((state) => state.user.permissions.canEditSupportManagement);
  const readonly = !supportErrand || isSupportErrandLocked(supportErrand) || !canEditSupportManagement;
  const readableDocuments = useMemo(() => documents.filter(({ permissions }) => permissions.canRead), [documents]);

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

      {readableDocuments.length === 0 ? (
        <Alert type="info">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description>Du saknar läsbehörighet till utredningsdokumenten.</Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

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
    </div>
  );
}
