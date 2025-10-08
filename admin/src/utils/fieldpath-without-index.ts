import { FieldPath, FieldValues } from 'react-hook-form';

export const fieldpathWithoutIndex = (fieldpath: FieldPath<FieldValues> | Array<FieldPath<FieldValues>>) => {
  const replacer = (string: string) => string.replace(/[.]\d+/g, '');
  if (typeof fieldpath === 'string') {
    return replacer(fieldpath);
  }
  if (Array.isArray(fieldpath)) {
    return fieldpath.map((path) => replacer(path));
  }
};
