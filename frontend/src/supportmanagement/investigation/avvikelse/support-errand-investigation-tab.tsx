'use client';

import { Alert, Button, Spinner, Tabs } from '@sk-web-gui/react';
import { useConfigStore, useSupportStore, useUserStore } from '@stores/index';
import { isSupportErrandLocked } from '@supportmanagement/services/support-errand-service';
import { useCallback, useMemo, useState } from 'react';

import type { InvestigationDocumentPlacement } from '../investigation-profile';
import { useInvestigationProfileStore } from '../investigation-profile-store';
import type { InvestigationTabProps } from '../investigation-variant';
import { getInvestigationDocumentApplicability } from './investigation-classification';
import {
  type InvestigationDocumentContext,
  type InvestigationTabState,
  isInvestigationDocumentEditable,
  resolveInvestigationTabState,
  visibleInvestigationDocuments,
} from './investigation-tab-state';
import { SupportInvestigationDocument } from './support-investigation-document.component';
import type { SupportInvestigationDocument as SavedInvestigationDocument } from './support-investigation-service';

interface TabCopy {
  readonly heading: string;
  readonly description: string;
  readonly dataCy: string;
  readonly noticePrefix: string;
  readonly notices: Readonly<Record<Exclude<InvestigationTabState, 'loading' | 'ready'>, string>>;
}

/**
 * The same document machinery serves both tabs; only what the handler is told differs. The
 * investigation copy is unchanged from before the decision tab existed.
 */
const tabCopy: Readonly<Record<InvestigationDocumentPlacement, TabCopy>> = {
  investigation: {
    heading: 'Utredning',
    description:
      'Dokumentera de olika delarna av utredningen. Varje del sparas separat och behåller sin schemaversion.',
    dataCy: 'support-investigation-tab',
    noticePrefix: 'investigation-tab',
    notices: {
      error: 'Utredningsprofilen kunde inte laddas. Utredningen kan därför inte visas.',
      unavailable: 'Utredningsfunktionen är tillfälligt otillgänglig. Försök igen senare.',
      'not-configured': 'Inga utredningsdokument är konfigurerade för den här applikationen.',
      'access-error': 'Behörigheterna kunde inte kontrolleras. Försök igen för att fortsätta.',
      'no-access': 'Du har inte behörighet till någon del av den här utredningen.',
    },
  },
  decision: {
    heading: 'Beslut',
    description:
      'Dokumentera beslutet som avslutar utredningen, inklusive ställningstagandet till anmälan till IVO. Beslutet sparas separat från utredningen och behåller sin schemaversion.',
    dataCy: 'support-decision-tab',
    noticePrefix: 'decision-tab',
    notices: {
      error: 'Utredningsprofilen kunde inte laddas. Beslutet kan därför inte visas.',
      unavailable: 'Utredningsfunktionen är tillfälligt otillgänglig. Försök igen senare.',
      'not-configured': 'Inga beslutsdokument är konfigurerade för den här applikationen.',
      'access-error': 'Behörigheterna kunde inte kontrolleras. Försök igen för att fortsätta.',
      'no-access': 'Du har inte behörighet till beslutet i det här ärendet.',
    },
  },
};

interface SupportErrandInvestigationTabProps extends InvestigationTabProps {
  /** Which tab this is; the investigation tab unless the variant says otherwise. */
  readonly placement?: InvestigationDocumentPlacement;
}

export function SupportErrandInvestigationTab(props: Readonly<SupportErrandInvestigationTabProps>) {
  const municipalityId = useConfigStore((state) => state.municipalityId);
  const errandId = useSupportStore((state) => state.supportErrand?.id);
  const username = useUserStore((state) => state.user.username);
  // Drafts live only in this user's currently opened errand, never across navigation or logout.
  return <InvestigationDocuments key={JSON.stringify([municipalityId, errandId, username])} {...props} />;
}

function InvestigationDocuments({
  onDirtyChange,
  access,
  refreshAccess,
  placement = 'investigation',
}: Readonly<SupportErrandInvestigationTabProps>) {
  const [activeDocumentKey, setActiveDocumentKey] = useState<string>();
  const [dirtyDocuments, setDirtyDocuments] = useState<Readonly<Record<string, boolean>>>({});
  const supportErrand = useSupportStore((state) => state.supportErrand);
  const canEditSupportManagement = useUserStore((state) => state.user.permissions.canEditSupportManagement);
  const profile = useInvestigationProfileStore((state) => state.profile);
  const profileStatus = useInvestigationProfileStore((state) => state.status);
  // Errand-wide readonly. Each document adds its own read-only grant on top of it below.
  const errandReadonly = !supportErrand || isSupportErrandLocked(supportErrand);
  const copy = tabCopy[placement];
  const applicability = getInvestigationDocumentApplicability(supportErrand);
  const documentContext = useMemo<InvestigationDocumentContext>(
    () => ({ placement, applicability, access }),
    [placement, applicability, access]
  );

  // Keep a stable panel for each configured document. Access controls its content, not the
  // lifetime of its draft. The tabs library keys panels by index, so filtering here loses drafts.
  const documents = useMemo(
    () => (profile?.documents ?? []).filter((document) => (document.placement ?? 'investigation') === placement),
    [profile, placement]
  );
  const visibleDocuments = useMemo(
    () => visibleInvestigationDocuments(profile, documentContext),
    [documentContext, profile]
  );
  const selectedKey =
    visibleDocuments.find((document) => document.key === activeDocumentKey)?.key ?? visibleDocuments[0]?.key;
  const activeTab = Math.max(
    0,
    documents.findIndex((document) => document.key === selectedKey)
  );
  const tabState = resolveInvestigationTabState(profileStatus, profile, documentContext);
  const hasHiddenDraft = documents.some(
    (document) => dirtyDocuments[document.key] && !visibleDocuments.some((visible) => visible.key === document.key)
  );

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
    for (const { key } of documents) {
      callbacks[key] = (isDirty: boolean) => {
        setDirtyDocuments((current) => (current[key] === isDirty ? current : { ...current, [key]: isDirty }));
        onDirtyChange(key, isDirty);
      };
    }
    return callbacks;
  }, [documents, onDirtyChange]);

  return (
    <div className="min-w-0 max-w-full p-16 sm:p-24 md:p-32" data-cy={copy.dataCy}>
      <div className="mb-24">
        <h2 className="text-h2-md">{copy.heading}</h2>
        <p className="mt-8">{copy.description}</p>
      </div>

      {tabState === 'loading' ? (
        <div className="flex justify-center p-24" data-cy={`${copy.noticePrefix}-loading`}>
          <Spinner size={4} aria-label={`${copy.heading} laddas`} />
        </div>
      ) : null}

      {tabState !== 'loading' && tabState !== 'ready' ? (
        <Alert type={tabState === 'not-configured' ? 'info' : 'warning'}>
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Description data-cy={`${copy.noticePrefix}-${tabState}`}>
              {copy.notices[tabState]}
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {hasHiddenDraft && (
        <p role="status" className="my-16">
          Du har osparade ändringar i ett dokument som inte kan visas just nu. Ändringarna finns kvar tills du lämnar
          sidan eller laddar om den.
        </p>
      )}
      {(tabState === 'access-error' || tabState === 'no-access') && (
        <Button className="my-16" variant="secondary" onClick={refreshAccess}>
          Kontrollera behörigheter igen
        </Button>
      )}

      {documents.length > 0 ? (
        <Tabs
          hidden={tabState !== 'ready'}
          className="w-full min-w-0 max-w-full rounded-12 border-1 bg-background-content"
          tabslistClassName="flex-wrap px-16 pt-16"
          panelsClassName="min-w-0 max-w-full border-t-1"
          current={activeTab}
          onTabChange={(index) => {
            if (visibleDocuments.some((document) => document.key === documents[index]?.key))
              setActiveDocumentKey(documents[index].key);
          }}
          size="sm"
        >
          {documents.map((definition) => (
            <Tabs.Item key={`${supportErrand?.id}:${definition.key}`}>
              <Tabs.Button
                hidden={!visibleDocuments.some((document) => document.key === definition.key)}
                className={visibleDocuments.some((document) => document.key === definition.key) ? undefined : 'hidden'}
                data-cy={`${definition.key}-tab`}
                onKeyDown={(event) => {
                  const index = visibleDocuments.findIndex((document) => document.key === definition.key);
                  const count = visibleDocuments.length;
                  if (!count || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                      ? count - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + count) % count;
                  setActiveDocumentKey(visibleDocuments[next].key);
                }}
              >
                {definition.tabLabel}
              </Tabs.Button>
              <Tabs.Content className="min-w-0 max-w-full">
                <SupportInvestigationDocument
                  definition={definition}
                  readable={
                    tabState === 'ready' && visibleDocuments.some((document) => document.key === definition.key)
                  }
                  readonly={errandReadonly || !isInvestigationDocumentEditable(definition, access)}
                  classificationReadonly={!canEditSupportManagement}
                  refreshAccess={refreshAccess}
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
