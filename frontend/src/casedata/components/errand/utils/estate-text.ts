export function estateToText(propertyDesignation?: string): string {
  if (!propertyDesignation) {
    return '(saknas)';
  }
  const municipalityName = propertyDesignation.toLowerCase().split(' ')[0];
  const propertyName = propertyDesignation
    .toLowerCase()
    .substring(propertyDesignation.toLowerCase().indexOf(' ') + 1);

  return (
    municipalityName.charAt(0).toUpperCase() +
    String(municipalityName).slice(1) +
    ' ' +
    propertyName.charAt(0).toUpperCase() +
    String(propertyName).slice(1)
  );
}
