'use client';

import { Alert, FormControl, FormLabel, Label, Select, Tabs } from '@sk-web-gui/react';
import {
  IAF_VOF_LABEL_CLASSIFICATION_CATALOGS,
  IAF_VOF_LABEL_CLASSIFICATION_GROUP,
  LabelClassificationCatalog,
  LabelClassificationSelection,
} from '@supportmanagement/investigation/label-classification';
import { FlaskConical } from 'lucide-react';
import { useMemo, useState } from 'react';

import { INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD } from '../investigation-classification';
import { normalizeInvestigationFormData } from '../investigation-form-data';
import { InvestigationLabelClassificationPanel } from './investigation-label-classification-panel.component';
import { InvestigationSchemaFormPanel } from './investigation-schema-form-panel.component';
import {
  InvestigationFormData,
  InvestigationLabNotice,
  InvestigationLabRole,
  InvestigationSchemaKey,
} from './investigation-schema-lab.types';
import { getInvestigationSchemaAccess, investigationLabRoleOptions } from './investigation-schema-lab-access';
import {
  loadInvestigationDraft,
  loadLabelClassificationDraft,
  removeInvestigationDraft,
  removeLabelClassificationDraft,
  saveInvestigationDraft,
  saveLabelClassificationDraft,
} from './investigation-schema-lab-storage';
import { getInvestigationSchemaDefinition, investigationSchemaDefinitions } from './investigation-schema-registry';

type DraftsBySchema = Record<InvestigationSchemaKey, InvestigationFormData>;
type SavedAtBySchema = Partial<Record<InvestigationSchemaKey, string>>;
type NoticesBySchema = Partial<Record<InvestigationSchemaKey, InvestigationLabNotice>>;

interface InitialLabState {
  drafts: DraftsBySchema;
  savedAt: SavedAtBySchema;
  notices: NoticesBySchema;
  labelClassification: LabelClassificationSelection;
  labelClassificationSavedAt?: string;
}

const emptyDrafts: DraftsBySchema = {
  'utredning-enhetschef': {},
  'utredning-sol-lss': {},
  'utredning-hsl': {},
};

const defaultLabelClassification: LabelClassificationSelection = {
  typeCode: 'hsl_fall',
  subtypeCode: 'hsl_fall_vid_forflyttning_med_personal',
};

const emptyLabelCatalog: LabelClassificationCatalog = {
  code: 'NO_LEGAL_BASIS',
  displayName: 'Välj lagrum',
  types: [],
};

function getManagerLabelCatalog(formData: InvestigationFormData): LabelClassificationCatalog {
  const legalBases = Array.isArray(formData.legalBases)
    ? formData.legalBases.filter((value): value is string => typeof value === 'string')
    : [];
  const catalogs: LabelClassificationCatalog[] = [];

  if (legalBases.includes('HSL')) {
    catalogs.push(IAF_VOF_LABEL_CLASSIFICATION_CATALOGS[IAF_VOF_LABEL_CLASSIFICATION_GROUP.HSL]);
  }
  if (legalBases.includes('SOL') || legalBases.includes('LSS')) {
    catalogs.push(IAF_VOF_LABEL_CLASSIFICATION_CATALOGS[IAF_VOF_LABEL_CLASSIFICATION_GROUP.SOL_LSS]);
  }

  if (catalogs.length === 0) return emptyLabelCatalog;
  if (catalogs.length === 1) return catalogs[0];

  return {
    code: catalogs.map((catalog) => catalog.code).join('_'),
    displayName: catalogs.map((catalog) => catalog.displayName).join(' / '),
    types: catalogs.flatMap((catalog) => catalog.types),
  };
}

function normalizeLabelClassification(
  catalog: LabelClassificationCatalog,
  value: LabelClassificationSelection
): LabelClassificationSelection {
  const selectedType = catalog.types.find((type) => type.code === value.typeCode);
  if (!selectedType) return {};

  const selectedSubtype = selectedType.subtypes.find((subtype) => subtype.code === value.subtypeCode);
  return {
    typeCode: selectedType.code,
    subtypeCode: selectedSubtype?.code,
  };
}

function isSameLabelClassification(left: LabelClassificationSelection, right: LabelClassificationSelection): boolean {
  return left.typeCode === right.typeCode && left.subtypeCode === right.subtypeCode;
}

function createInitialLabState(): InitialLabState {
  const drafts: DraftsBySchema = { ...emptyDrafts };
  const savedAt: SavedAtBySchema = {};
  const notices: NoticesBySchema = {};
  let browserStorage: Storage | undefined;

  try {
    browserStorage = typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    notices['utredning-enhetschef'] = {
      type: 'warning',
      message: 'localStorage är inte tillgängligt. Exempeldata visas, men lokala utkast kan inte återställas.',
    };
  }

  for (const definition of investigationSchemaDefinitions) {
    if (!browserStorage) {
      drafts[definition.key] = normalizeInvestigationFormData(
        definition.key,
        definition.schema,
        definition.exampleFormData
      );
      continue;
    }

    const loadedDraft = loadInvestigationDraft(browserStorage, definition.key, definition.schemaVersion);
    const initialFormData = loadedDraft.savedAt ? loadedDraft.formData : definition.exampleFormData;
    drafts[definition.key] = normalizeInvestigationFormData(definition.key, definition.schema, initialFormData);

    if (loadedDraft.savedAt) savedAt[definition.key] = loadedDraft.savedAt;
    if (loadedDraft.warning) notices[definition.key] = { type: 'warning', message: loadedDraft.warning };
  }

  const managerLabelCatalog = getManagerLabelCatalog(drafts['utredning-enhetschef']);
  if (!browserStorage) {
    return {
      drafts,
      savedAt,
      notices,
      labelClassification: normalizeLabelClassification(managerLabelCatalog, defaultLabelClassification),
    };
  }

  const loadedLabelClassification = loadLabelClassificationDraft(browserStorage);
  const initialLabelClassification = loadedLabelClassification.savedAt
    ? loadedLabelClassification.value
    : defaultLabelClassification;
  const normalizedLabelClassification = normalizeLabelClassification(managerLabelCatalog, initialLabelClassification);
  if (loadedLabelClassification.warning) {
    notices['utredning-enhetschef'] = { type: 'warning', message: loadedLabelClassification.warning };
  } else if (
    loadedLabelClassification.savedAt &&
    !isSameLabelClassification(normalizedLabelClassification, initialLabelClassification)
  ) {
    notices['utredning-enhetschef'] = {
      type: 'warning',
      message: 'Den lokalt sparade labelmocken passar inte längre valda lagrum och har därför ignorerats.',
    };
  }

  return {
    drafts,
    savedAt,
    notices,
    labelClassification: normalizedLabelClassification,
    labelClassificationSavedAt: isSameLabelClassification(normalizedLabelClassification, initialLabelClassification)
      ? loadedLabelClassification.savedAt
      : undefined,
  };
}

export function InvestigationSchemaLab() {
  const [initialLabState] = useState(createInitialLabState);
  const [activeTab, setActiveTab] = useState(0);
  const [role, setRole] = useState<InvestigationLabRole>('unitManager');
  const [drafts, setDrafts] = useState<DraftsBySchema>(initialLabState.drafts);
  const [savedAt, setSavedAt] = useState<SavedAtBySchema>(initialLabState.savedAt);
  const [notices, setNotices] = useState<NoticesBySchema>(initialLabState.notices);
  const [labelClassification, setLabelClassification] = useState<LabelClassificationSelection>(
    initialLabState.labelClassification
  );
  const [labelClassificationSavedAt, setLabelClassificationSavedAt] = useState<string | undefined>(
    initialLabState.labelClassificationSavedAt
  );
  const [labelClassificationNotice, setLabelClassificationNotice] = useState<string>();

  const selectedRole = useMemo(
    () => investigationLabRoleOptions.find((roleOption) => roleOption.value === role)!,
    [role]
  );

  const managerLabelCatalog = useMemo(() => getManagerLabelCatalog(drafts['utredning-enhetschef']), [drafts]);

  const updateLabelClassification = (
    schemaKey: InvestigationSchemaKey,
    catalog: LabelClassificationCatalog,
    value: LabelClassificationSelection
  ) => {
    const normalizedValue = normalizeLabelClassification(catalog, value);
    setLabelClassification(normalizedValue);
    setLabelClassificationNotice(undefined);

    try {
      const timestamp = saveLabelClassificationDraft(window.localStorage, normalizedValue);
      setLabelClassificationSavedAt(timestamp);
      setNotices((currentNotices) => ({ ...currentNotices, [schemaKey]: undefined }));
    } catch {
      setNotices((currentNotices) => ({
        ...currentNotices,
        [schemaKey]: {
          type: 'error',
          message: 'Labelmocken kunde inte sparas lokalt. Kontrollera webbläsarens lagringsinställningar.',
        },
      }));
    }
  };

  const updateDraft = (schemaKey: InvestigationSchemaKey, formData: InvestigationFormData) => {
    const definition = getInvestigationSchemaDefinition(schemaKey);
    const normalizedData = normalizeInvestigationFormData(schemaKey, definition.schema, formData);
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [schemaKey]: normalizedData,
    }));

    if (schemaKey === 'utredning-enhetschef') {
      const nextCatalog = getManagerLabelCatalog(normalizedData);
      const normalizedLabels = normalizeLabelClassification(nextCatalog, labelClassification);
      if (!isSameLabelClassification(normalizedLabels, labelClassification)) {
        setLabelClassification(normalizedLabels);
        try {
          const timestamp = saveLabelClassificationDraft(window.localStorage, normalizedLabels);
          setLabelClassificationSavedAt(timestamp);
          setLabelClassificationNotice(
            'Vald ärendeklassificering passade inte längre valda lagrum och har därför rensats.'
          );
        } catch {
          setNotices((currentNotices) => ({
            ...currentNotices,
            [schemaKey]: {
              type: 'error',
              message: 'Lagrum ändrades, men labelmocken kunde inte uppdateras i localStorage.',
            },
          }));
        }
      }
    }
  };

  const persistDraft = (
    schemaKey: InvestigationSchemaKey,
    schemaVersion: string,
    formData: InvestigationFormData,
    validated: boolean
  ) => {
    try {
      const definition = getInvestigationSchemaDefinition(schemaKey);
      const normalizedData = normalizeInvestigationFormData(schemaKey, definition.schema, formData);
      const timestamp = saveInvestigationDraft(window.localStorage, schemaKey, schemaVersion, normalizedData);
      setDrafts((currentDrafts) => ({ ...currentDrafts, [schemaKey]: normalizedData }));
      setSavedAt((currentSavedAt) => ({ ...currentSavedAt, [schemaKey]: timestamp }));
      setNotices((currentNotices) => ({
        ...currentNotices,
        [schemaKey]: {
          type: 'success',
          message: validated
            ? 'Formuläret är validerat mot schemat och sparat i den här webbläsaren.'
            : 'Utkastet är sparat i den här webbläsaren utan fullständig validering.',
        },
      }));
    } catch {
      setNotices((currentNotices) => ({
        ...currentNotices,
        [schemaKey]: {
          type: 'error',
          message: 'Utkastet kunde inte sparas lokalt. Kontrollera webbläsarens lagringsinställningar.',
        },
      }));
    }
  };

  const resetDraft = (schemaKey: InvestigationSchemaKey, exampleFormData: InvestigationFormData) => {
    const confirmed = window.confirm(
      'Rensa det lokala utkastet och återställ exempeldata för den här utredningen? Åtgärden kan inte ångras.'
    );
    if (!confirmed) return;

    try {
      removeInvestigationDraft(window.localStorage, schemaKey);
      if (schemaKey === 'utredning-enhetschef') removeLabelClassificationDraft(window.localStorage);
    } catch {
      setNotices((currentNotices) => ({
        ...currentNotices,
        [schemaKey]: {
          type: 'error',
          message: 'Det lokala utkastet kunde inte tas bort. Kontrollera webbläsarens lagringsinställningar.',
        },
      }));
      return;
    }

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [schemaKey]: normalizeInvestigationFormData(
        schemaKey,
        getInvestigationSchemaDefinition(schemaKey).schema,
        exampleFormData
      ),
    }));
    if (schemaKey === 'utredning-enhetschef') {
      const resetCatalog = getManagerLabelCatalog(exampleFormData);
      setLabelClassification(normalizeLabelClassification(resetCatalog, defaultLabelClassification));
      setLabelClassificationSavedAt(undefined);
      setLabelClassificationNotice(undefined);
    }
    setSavedAt((currentSavedAt) => ({ ...currentSavedAt, [schemaKey]: undefined }));
    setNotices((currentNotices) => ({
      ...currentNotices,
      [schemaKey]: { type: 'info', message: 'Det lokala utkastet har rensats och exempeldata har återställts.' },
    }));
  };

  return (
    <main className="min-h-screen min-w-0 bg-background-100 px-16 py-24 md:px-32 md:py-40">
      <div className="mx-auto w-full min-w-0 max-w-content" data-cy="investigation-schema-lab-content">
        <header className="mb-24">
          <div className="mb-8 flex min-w-0 flex-wrap items-center gap-12">
            <FlaskConical aria-hidden="true" />
            <h1 className="text-h2-md">Lokal schema-labb · Utredning</h1>
            <Label rounded inverted color="vattjom">
              Endast utveckling
            </Label>
          </div>
          <p className="max-w-[90rem]">
            Här kan de tre utredningsschemana provas med Drakens riktiga RJSF- och komponentlib-rendering innan de
            publiceras till JSON Schema API.
          </p>
        </header>

        <Alert type="info" className="mb-24">
          <Alert.Icon />
          <Alert.Content>
            <Alert.Content.Title>Isolerad från verksamhetsdata</Alert.Content.Title>
            <Alert.Content.Description>
              Inga anrop för att läsa eller skriva ärenden eller scheman görs från den här sidan. Utkast lagras endast i
              webbläsarens localStorage och kan rensas per flik.
            </Alert.Content.Description>
          </Alert.Content>
        </Alert>

        <section
          className="mb-24 min-w-0 max-w-full rounded-12 border-1 bg-background-content p-16 sm:p-20"
          aria-labelledby="mock-access-heading"
        >
          <h2 id="mock-access-heading" className="text-h4-md mb-16">
            Mockad behörighet
          </h2>
          <div className="flex flex-wrap items-end gap-16">
            <FormControl className="w-full max-w-[40rem]">
              <FormLabel>Testroll</FormLabel>
              <Select
                value={role}
                onChange={(event) => setRole(event.currentTarget.value as InvestigationLabRole)}
                data-cy="investigation-lab-role"
              >
                {investigationLabRoleOptions.map((roleOption) => (
                  <Select.Option key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
            <p className="text-small pb-8">{selectedRole.description} Övriga scheman visas skrivskyddade.</p>
          </div>
        </section>

        <Tabs
          className="w-full min-w-0 max-w-full rounded-12 border-1 bg-background-content"
          tabslistClassName="flex-wrap px-16 pt-16"
          panelsClassName="min-w-0 max-w-full border-t-1"
          current={activeTab}
          onTabChange={setActiveTab}
          size="sm"
        >
          {investigationSchemaDefinitions.map((definition) => {
            const access = getInvestigationSchemaAccess(role, definition.key);
            const classificationCatalog =
              definition.key === 'utredning-enhetschef'
                ? managerLabelCatalog
                : definition.key === 'utredning-sol-lss'
                ? IAF_VOF_LABEL_CLASSIFICATION_CATALOGS[IAF_VOF_LABEL_CLASSIFICATION_GROUP.SOL_LSS]
                : undefined;

            return (
              <Tabs.Item key={definition.key}>
                <Tabs.Button data-cy={`${definition.key}-tab`}>{definition.tabLabel}</Tabs.Button>
                <Tabs.Content className="min-w-0 max-w-full">
                  <InvestigationSchemaFormPanel
                    definition={definition}
                    access={access}
                    formData={drafts[definition.key]}
                    savedAt={savedAt[definition.key]}
                    notice={notices[definition.key]}
                    externalFields={
                      classificationCatalog
                        ? {
                            [INVESTIGATION_CLASSIFICATION_EXTERNAL_FIELD]: (
                              <InvestigationLabelClassificationPanel
                                headingId={`${definition.key}-label-classification-heading`}
                                catalog={classificationCatalog}
                                value={labelClassification}
                                canWrite={access.canWrite}
                                savedAt={labelClassificationSavedAt}
                                notice={labelClassificationNotice}
                                onChange={(value) =>
                                  updateLabelClassification(definition.key, classificationCatalog, value)
                                }
                              />
                            ),
                          }
                        : undefined
                    }
                    onChange={(formData) => updateDraft(definition.key, formData)}
                    onSaveDraft={() =>
                      persistDraft(definition.key, definition.schemaVersion, drafts[definition.key], false)
                    }
                    onValidatedSave={(formData) =>
                      persistDraft(definition.key, definition.schemaVersion, formData, true)
                    }
                    onRemoveDraft={() => resetDraft(definition.key, definition.exampleFormData)}
                  />
                </Tabs.Content>
              </Tabs.Item>
            );
          })}
        </Tabs>
      </div>
    </main>
  );
}
