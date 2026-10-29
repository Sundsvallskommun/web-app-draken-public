const swedishList = new Intl.ListFormat('sv', { style: 'long', type: 'conjunction' });

/** Whether rich text holds any visible text; an emptied editor leaves markup such as `<p><br></p>`. */
export const hasVisibleText = (html?: string): boolean =>
  !!html &&
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;

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
