'use client';

import { Tabs } from '@sk-web-gui/react';
import { useMetadataStore, useSupportStore, useUserStore } from '@stores/index';
import { IafLabelCategorization } from '@supportmanagement/components/support-errand-basics-form/iaf-label-categorization.component';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useCallback, useMemo, useState } from 'react';

import { type InvestigationDocumentKey, investigationDocuments } from './investigation-document';
import { SupportInvestigationDocument } from './support-investigation-document.component';
import type { SupportInvestigationDocument as SavedInvestigationDocument } from './support-investigation-service';

interface SupportErrandInvestigationTabProps {
  onDirtyChange: (key: InvestigationDocumentKey, isDirty: boolean) => void;
}

export function SupportErrandInvestigationTab({ onDirtyChange }: SupportErrandInvestigationTabProps) {
  const [activeTab, setActiveTab] = useState(0);
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const supportMetadata = useMetadataStore((state) => state.supportMetadata);
  const canEditSupportManagement = useUserStore((state) => state.user.permissions.canEditSupportManagement);
  const readonly = !supportErrand || isSupportErrandLocked(supportErrand) || !canEditSupportManagement;

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

  const dirtyCallbacks = useMemo(
    () =>
      Object.fromEntries(
        investigationDocuments.map(({ key }) => [key, (isDirty: boolean) => onDirtyChange(key, isDirty)])
      ) as Record<InvestigationDocumentKey, (isDirty: boolean) => void>,
    [onDirtyChange]
  );

  return (
    <div className="min-w-0 max-w-full p-16 sm:p-24 md:p-32" data-cy="support-investigation-tab">
      <div className="mb-24">
        <h2 className="text-h2-md">Utredning</h2>
        <p className="mt-8">
          Dokumentera de olika delarna av utredningen. Varje del sparas separat och behåller sin schemaversion.
        </p>
      </div>

      <Tabs
        className="w-full min-w-0 max-w-full rounded-12 border-1 bg-background-content"
        tabslistClassName="flex-wrap px-16 pt-16"
        panelsClassName="min-w-0 max-w-full border-t-1"
        current={activeTab}
        onTabChange={setActiveTab}
        size="sm"
      >
        {investigationDocuments.map((definition) => (
          <Tabs.Item key={definition.key}>
            <Tabs.Button data-cy={`${definition.key}-tab`}>{definition.tabLabel}</Tabs.Button>
            <Tabs.Content className="min-w-0 max-w-full">
              {definition.key === 'utredning-enhetschef' && (
                <div className="mx-16 mt-24 border-b-1 px-0 pb-32 sm:mx-24 md:mx-32">
                  <IafLabelCategorization supportMetadata={supportMetadata} disabled={readonly} />
                  {!readonly && (
                    <p className="mt-16 text-small text-dark-secondary">
                      Kategoriseringen sparas separat med knappen Spara ärende i panelen Handläggning.
                    </p>
                  )}
                </div>
              )}
              <SupportInvestigationDocument
                definition={definition}
                readonly={readonly}
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
