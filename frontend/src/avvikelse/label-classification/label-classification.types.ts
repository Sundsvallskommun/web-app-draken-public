export interface LabelClassificationOption {
  readonly code: string;
  readonly displayName: string;
}

export type LabelClassificationSubtypeOption = LabelClassificationOption;

export interface LabelClassificationTypeOption extends LabelClassificationOption {
  readonly subtypes: readonly LabelClassificationSubtypeOption[];
}

/**
 * One selectable classification group. A SupportManagement metadata adapter can
 * supply the same shape when the local mock catalog is retired.
 */
export interface LabelClassificationCatalog {
  readonly code: string;
  readonly displayName: string;
  readonly types: readonly LabelClassificationTypeOption[];
}

/** Shared controlled value for the component, page state and persistence. */
export interface LabelClassificationSelection {
  readonly typeCode?: string;
  readonly subtypeCode?: string;
}
