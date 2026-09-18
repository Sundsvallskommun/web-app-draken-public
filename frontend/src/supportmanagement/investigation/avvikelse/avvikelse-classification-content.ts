import type { LabelClassificationContent } from './label-classification/label-classification.component';

/** What the avvikelse category and undercategory selectors say, wherever they are shown. */
export const avvikelseClassificationContent: LabelClassificationContent = Object.freeze({
  typeLabel: 'Avvikelsetyp (obligatoriskt)',
  typePlaceholder: 'Välj avvikelsetyp',
  typeEmptyPlaceholder: 'Inga avvikelsetyper tillgängliga',
  typeHelperText: 'Huvudkategori för avvikelsen',
  subtypeLabel: 'Underkategori (obligatorisk)',
  subtypePlaceholder: 'Välj underkategori',
  subtypeBeforeTypePlaceholder: 'Välj avvikelsetyp först',
  subtypeEmptyPlaceholder: 'Saknar underkategorier',
  subtypeHelperText: 'Underkategori för avvikelsen',
});

/** What the categorization says about the legal bases its selectors follow, wherever it is shown. */
export const avvikelseGroupedClassificationContent = Object.freeze({
  noLegalBases: 'Välj lagrum för att kunna kategorisera ärendet.',
  everyLegalBase: 'Välj avvikelsetyp och underkategori för varje valt lagrum.',
});
