import { useCallback, useState } from 'react';

type EditableFields = Record<string, string>;

/** The shape a resource from the API has: the fields we edit, possibly absent or null. */
type Source<T> = Partial<Record<keyof T, string | null | undefined>> | undefined;

/**
 * A field is only replaced while it still holds what was loaded, so text the user has started
 * writing survives a reload of the resource behind it.
 */
export const keepUnsavedEdits = <T extends EditableFields>(current: T, loaded: T, incoming: T): T =>
  Object.fromEntries(
    Object.keys(incoming).map((key) => [key, current[key] === loaded[key] ? incoming[key] : current[key]])
  ) as T;

/**
 * Local fields filled from a resource on the server and written back with their own save button.
 * The errand is read again whenever it changes, saving the errand included, so a reload must not
 * wipe what the handler is in the middle of writing.
 *
 * `load` lets the server win, for the cases where it should: the resource was just created, just
 * saved, or a colleague got there first. `merge` keeps the unsaved edits. `edited` is true while
 * something is written but not yet saved, for the warning before the page is left.
 */
export const useUnsavedEdits = <T extends EditableFields>(empty: T) => {
  // The fields are fixed for the lifetime of the component, and values and loaded change together,
  // so they are held as one state and the callbacks stay stable.
  const [keys] = useState(() => Object.keys(empty));
  const [state, setState] = useState<{ values: T; loaded: T }>({ values: empty, loaded: empty });

  const asFields = useCallback(
    (source: Source<T>): T => Object.fromEntries(keys.map((key) => [key, source?.[key as keyof T] ?? ''])) as T,
    [keys]
  );

  const load = useCallback(
    (source: Source<T>) => {
      const incoming = asFields(source);
      setState({ values: incoming, loaded: incoming });
    },
    [asFields]
  );

  const merge = useCallback(
    (source: Source<T>) => {
      const incoming = asFields(source);
      setState((current) => ({ values: keepUnsavedEdits(current.values, current.loaded, incoming), loaded: incoming }));
    },
    [asFields]
  );

  const set = useCallback(
    (key: keyof T, value: string) =>
      setState((current) => ({ ...current, values: { ...current.values, [key]: value } })),
    []
  );

  /** True while a field holds something other than what was loaded. */
  const edited = keys.some((key) => state.values[key] !== state.loaded[key]);

  return { values: state.values, set, load, merge, edited };
};
