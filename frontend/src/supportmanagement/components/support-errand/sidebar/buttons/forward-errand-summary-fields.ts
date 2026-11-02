import { sanitizedInline } from '@common/services/sanitizer-service';

const swedishList = new Intl.ListFormat('sv', { style: 'long', type: 'conjunction' });

/**
 * Whether rich text holds any visible text; an emptied editor leaves markup such as `<p><br></p>`. The text
 * comes from the HTML sanitizer, which also turns `&nbsp;` into a space that `trim` removes.
 */
export const hasVisibleText = (html?: string): boolean => !!html && sanitizedInline(html).trim().length > 0;

/**
 * The note telling which fields are not carried over because the errand lacks them, e.g. "Ärendebeskrivning
 * och parter saknas i detta ärende och kommer därför inte att överlämnas." Undefined when nothing is missing.
 */
export const getMissingFieldsNote = (missingFieldNames: string[]): string | undefined => {
  if (missingFieldNames.length === 0) {
    return undefined;
  }
  const [firstName, ...otherNames] = missingFieldNames;
  const names = swedishList.format([firstName, ...otherNames.map((name) => name.toLowerCase())]);
  return `${names} saknas i detta ärende och kommer därför inte att överlämnas.`;
};
