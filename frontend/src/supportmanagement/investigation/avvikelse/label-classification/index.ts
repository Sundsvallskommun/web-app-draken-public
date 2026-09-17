export {
  AVVIKELSE_LABEL_CLASSIFICATION_CATALOGS,
  AVVIKELSE_LABEL_CLASSIFICATION_GROUP,
} from './avvikelse-label-classification.mock';
export type {
  AvvikelseClassificationGroup,
  AvvikelseGroupedClassificationModel,
  AvvikelseGroupedClassificationUpdate,
  LabelClassificationLegalBaseRule,
} from './avvikelse-supportmanagement-label-classification';
export {
  applyAvvikelseGroupedClassificationSelection,
  applyAvvikelseLabelClassificationSelection,
  createAvvikelseGroupedClassificationModel,
  createAvvikelseLabelClassificationModel,
  getAvvikelseGroupedClassificationSelection,
  getAvvikelseLabelClassificationSelection,
  getMissingAvvikelseGroupedClassificationChoices,
  getPersistedAvvikelseGroupedClassificationState,
} from './avvikelse-supportmanagement-label-classification';
export { LabelClassification } from './label-classification.component';
export type { LabelClassificationCatalog, LabelClassificationSelection } from './label-classification.types';
