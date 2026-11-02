interface WithDisplayName {
  displayName: string;
}

// Active Directory display names are written "Efternamn Förnamn". Only the first word is the last name, so
// every following word is kept as first name instead of dropped (e.g. "Svensson Karin E").
export const splitAdDisplayName = (displayName: string): { firstName: string; lastName: string } => {
  const [lastName = '', ...firstNames] = displayName.trim().split(/\s+/);
  return { firstName: firstNames.join(' '), lastName };
};

export const compareByDisplayName = (a: WithDisplayName, b: WithDisplayName): number =>
  a.displayName.localeCompare(b.displayName, 'sv');

export const displayNameMatchesQuery = (item: WithDisplayName, query: string): boolean =>
  item.displayName.toLowerCase().includes(query.toLowerCase());
