/** The /access response for an unrestricted handler, independent of any AD group fixture. */
export const mockErrandAccess = () => ({
  level: 'RW',
  fields: [{ field: 'jsonParameters', allKeys: true, keys: [] as { key: string; level: string }[] }],
  resources: [{ resource: 'errand/json-parameter', level: 'RW' }],
});
