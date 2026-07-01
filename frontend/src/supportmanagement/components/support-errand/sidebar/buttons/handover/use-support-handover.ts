import {
  HandoverErrand,
  HandoverErrandRequest,
  HandoverInclude,
  HandoverPreview,
  HandoverSourceAction,
  Label,
  NamespaceConfig,
} from '@common/data-contracts/supportmanagement/data-contracts';
import { Resolution, Status } from '@supportmanagement/services/support-errand-service';
import {
  executeHandover,
  getHandoverPreview,
  getNamespaceConfigs,
  getNamespaceMetadata,
  HandoverError,
} from '@supportmanagement/services/support-handover-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type HandoverStep = 1 | 2;

/** Special value used in the target dropdown for the existing casedata (MEX) forward flow. */
export const MEX_DEPARTMENT_VALUE = 'SBK_MEX';

/**
 * TEMPORARY – per-namespace categorization model during the migration to labels.
 *
 * These namespaces still use TWO-level categorization (category/type) in the handover modal:
 *   - CONTACTCENTER     (Kontaktcenter)
 *   - CONTACTSUNDSVALL  (Kontakt Sundsvall)
 *   - ROB
 * Every other target namespace uses THREE-level categorization (labels).
 *
 * REMOVE this list – and always classify via labels – once the API migration to labels is done for
 * all namespaces.
 */
export const TWO_LEVEL_CATEGORIZATION_NAMESPACES = ['CONTACTCENTER', 'CONTACTSUNDSVALL', 'ROB'];

const defaultIncludes = (): HandoverInclude => ({
  stakeholders: true,
  externalTags: true,
  parameters: true,
  jsonParameters: true,
  attachments: true,
  businessRelated: true,
  escalationEmail: true,
  contactReasonDescription: true,
});

interface UseSupportHandoverArgs {
  errandId?: string;
  sourceMunicipalityId: string;
  sourceNamespace?: string;
}

/**
 * Orchestrates the supportmanagement -> supportmanagement handover flow: loading target namespaces,
 * fetching/caching the preview, holding the user's mapping choices and executing the handover with a
 * stable idempotency key. UI rendering lives in the presentational components.
 */
export const useSupportHandover = ({ errandId, sourceMunicipalityId, sourceNamespace }: UseSupportHandoverArgs) => {
  const [namespaceConfigs, setNamespaceConfigs] = useState<NamespaceConfig[]>([]);
  const [step, setStep] = useState<HandoverStep>(1);

  const [previewCache, setPreviewCache] = useState<Record<string, HandoverPreview>>({});
  const [preview, setPreview] = useState<HandoverPreview | undefined>(undefined);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | undefined>(undefined);

  // Target namespace metadata (categories + label tree), used for display names and three-level
  // classification (cached per namespace).
  const [targetMetadata, setTargetMetadata] = useState<SupportMetadata | undefined>(undefined);
  const [metadataCache, setMetadataCache] = useState<Record<string, SupportMetadata>>({});
  // The namespace currently being previewed – drives the categorization model (see below).
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');

  // Mapping selections
  const [mappingCategory, setMappingCategory] = useState<string>('');
  const [mappingType, setMappingType] = useState<string>('');
  const [mappingContactReason, setMappingContactReason] = useState<string>('');
  // Three-level classification: the labels chosen from the target namespace label tree.
  const [threeLevelLabels, setThreeLevelLabels] = useState<Label[]>([]);

  // Optional message added as an internal conversation on the new errand (markup + plaintext).
  const [message, setMessage] = useState<string>('');
  const [messageBodyPlaintext, setMessageBodyPlaintext] = useState<string>('');

  // Idempotency keys per target (`${municipality}:${namespace}`). A stable key is generated the first
  // time a target reaches step 2 and reused for every retry and whenever the user returns to that
  // target, so a retry never creates a duplicate errand – even after switching targets in between.
  const [idempotencyKeys, setIdempotencyKeys] = useState<Record<string, string>>({});

  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverError, setHandoverError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (sourceMunicipalityId) {
      getNamespaceConfigs(sourceMunicipalityId).then(setNamespaceConfigs);
    }
  }, [sourceMunicipalityId]);

  /** Target namespaces the errand can be handed over to (excluding the source namespace). */
  const handoverTargets = useMemo(
    () => namespaceConfigs.filter((config) => config.namespace && config.namespace !== sourceNamespace),
    [namespaceConfigs, sourceNamespace]
  );

  // TEMPORARY: the classification model is decided per target namespace. The namespaces in
  // TWO_LEVEL_CATEGORIZATION_NAMESPACES use category/type; every other namespace uses labels.
  // Remove this branch (always use labels) once the labels migration is complete.
  const targetUsesLabels = !!selectedNamespace && !TWO_LEVEL_CATEGORIZATION_NAMESPACES.includes(selectedNamespace);

  const applyPreviewDefaults = useCallback((data: HandoverPreview) => {
    const mappingRequired = data.mappingRequired;
    setMappingCategory(mappingRequired?.classification?.suggestedCategory ?? '');
    setMappingType(mappingRequired?.classification?.suggestedType ?? '');
    setMappingContactReason(mappingRequired?.contactReason?.suggested ?? '');
  }, []);

  /** Resets the mapping/preview state without dropping the cache (used when leaving the modal). */
  const reset = useCallback(() => {
    setStep(1);
    setPreview(undefined);
    setPreviewError(undefined);
    setHandoverError(undefined);
    setIdempotencyKeys({});
    setPreviewCache({});
    setMessage('');
    setMessageBodyPlaintext('');
    setThreeLevelLabels([]);
    setSelectedNamespace('');
  }, []);

  /** Fetches (or reuses a cached) preview for the given target and advances to step 2. */
  const runPreview = useCallback(
    async (target: NamespaceConfig) => {
      if (!errandId || !target.namespace) {
        return;
      }
      const namespace = target.namespace;
      setSelectedNamespace(namespace);
      setPreviewError(undefined);

      // Load the target namespace metadata (cached) – used for display names (two-level) and the
      // label tree (three-level classification).
      const cachedMetadata = metadataCache[namespace];
      if (cachedMetadata) {
        setTargetMetadata(cachedMetadata);
      } else {
        getNamespaceMetadata(sourceMunicipalityId, namespace).then((metadata) => {
          setMetadataCache((prev) => ({ ...prev, [namespace]: metadata }));
          setTargetMetadata(metadata);
        });
      }

      const cacheKey = `${sourceMunicipalityId}:${namespace}`;
      // Ensure this target has a stable idempotency key (kept across retries and target switches).
      setIdempotencyKeys((prev) => (prev[cacheKey] ? prev : { ...prev, [cacheKey]: uuidv4() }));

      const cached = previewCache[cacheKey];
      if (cached) {
        setPreview(cached);
        applyPreviewDefaults(cached);
        setStep(2);
        return;
      }
      setPreviewLoading(true);
      try {
        const data = await getHandoverPreview(sourceMunicipalityId, errandId, {
          targetNamespace: namespace,
          targetMunicipalityId: sourceMunicipalityId,
        });
        setPreviewCache((prev) => ({ ...prev, [cacheKey]: data }));
        setPreview(data);
        applyPreviewDefaults(data);
        setStep(2);
      } catch (error) {
        setPreviewError((error as HandoverError).message);
      } finally {
        setPreviewLoading(false);
      }
    },
    [errandId, sourceMunicipalityId, previewCache, metadataCache, applyPreviewDefaults]
  );

  const buildRequest = useCallback(
    (target: NamespaceConfig): HandoverErrandRequest => {
      // Three-level targets classify via the label tree. Mirror how a three-level errand is saved:
      // classification holds the category/type *resourcePaths*, and labels holds the label UUIDs
      // (category + type + optional subtype). Both are required by the backend.
      const categoryLabel = threeLevelLabels.find((label) => label.classification === 'CATEGORY');
      const typeLabel = threeLevelLabels.find((label) => label.classification === 'TYPE');
      const classification = targetUsesLabels
        ? categoryLabel && typeLabel
          ? { category: categoryLabel.resourcePath, type: typeLabel.resourcePath }
          : undefined
        : mappingCategory || mappingType
        ? { category: mappingCategory || undefined, type: mappingType || undefined }
        : undefined;
      const labels = targetUsesLabels
        ? threeLevelLabels.map((label) => label.id).filter((id): id is string => !!id)
        : [];

      return {
        target: { namespace: target.namespace as string, municipalityId: sourceMunicipalityId },
        mapping: {
          // A handed-over errand always starts as NEW in the target namespace.
          status: Status.NEW,
          classification,
          // labels is required and must always be a list.
          labels,
          contactReason: mappingContactReason || undefined,
          channel: 'WEB_UI',
        },
        // Always copy everything that can be copied. Letting the user choose is a future enhancement.
        include: defaultIncludes(),
        // Mirror the casedata (MEX) forward: the source errand is closed with the same status/resolution.
        sourceHandling: {
          action: HandoverSourceAction.CLOSE,
          status: Status.SOLVED,
          resolution: Resolution.REGISTERED_EXTERNAL_SYSTEM,
          closingComment: 'Överlämnad till annan drake',
        },
      };
    },
    [sourceMunicipalityId, targetUsesLabels, mappingCategory, mappingType, threeLevelLabels, mappingContactReason]
  );

  /** Executes the handover. Returns the result on success (caller closes the modal like the MEX
   * forward); on 4xx keeps step 2 and exposes the error. */
  const runHandover = useCallback(
    async (target: NamespaceConfig): Promise<HandoverErrand | undefined> => {
      if (!errandId) {
        return undefined;
      }
      // Reuse this target's stable idempotency key (set in runPreview before step 2).
      const idempotencyKey = idempotencyKeys[`${sourceMunicipalityId}:${target.namespace}`] ?? uuidv4();
      setHandoverError(undefined);
      setHandoverLoading(true);
      try {
        return await executeHandover(sourceMunicipalityId, errandId, buildRequest(target), idempotencyKey, message);
      } catch (error) {
        setHandoverError((error as HandoverError).message);
        return undefined;
      } finally {
        setHandoverLoading(false);
      }
    },
    [errandId, sourceMunicipalityId, buildRequest, idempotencyKeys, message]
  );

  /** True when every namespace-bound field that requires a decision has an answer. */
  const requiredMappingsAnswered = useMemo(() => {
    const mappingRequired = preview?.mappingRequired;
    if (targetUsesLabels) {
      // Three-level requires at least category + type (the label tree sets them together).
      if (threeLevelLabels.length < 2) {
        return false;
      }
    } else {
      const classificationCandidates = mappingRequired?.classification?.candidates;
      if (
        classificationCandidates &&
        Object.keys(classificationCandidates).length &&
        (!mappingCategory || !mappingType)
      ) {
        return false;
      }
    }
    if (mappingRequired?.contactReason?.candidates?.length && !mappingContactReason) {
      return false;
    }
    return true;
  }, [preview, targetUsesLabels, mappingCategory, mappingType, mappingContactReason, threeLevelLabels]);

  return {
    namespaceConfigs,
    handoverTargets,
    step,
    setStep,
    preview,
    previewLoading,
    previewError,
    targetMetadata,
    targetUsesLabels,
    mapping: {
      category: mappingCategory,
      type: mappingType,
      contactReason: mappingContactReason,
    },
    setMappingCategory,
    setMappingType,
    setMappingContactReason,
    threeLevelLabels,
    setThreeLevelLabels,
    message,
    messageBodyPlaintext,
    setMessage,
    setMessageBodyPlaintext,
    handoverLoading,
    handoverError,
    runPreview,
    runHandover,
    requiredMappingsAnswered,
    reset,
  };
};

export type SupportHandoverState = ReturnType<typeof useSupportHandover>;
