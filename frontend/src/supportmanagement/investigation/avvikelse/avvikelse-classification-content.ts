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
