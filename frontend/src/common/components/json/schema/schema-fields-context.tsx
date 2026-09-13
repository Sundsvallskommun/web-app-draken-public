'use client';

import type { RegistryFieldsType } from '@rjsf/utils';
import { createContext, useContext } from 'react';

/** The application supplies business fields; common owns no business implementations. */
const SchemaFieldsContext = createContext<RegistryFieldsType>({});
export const SchemaFieldsProvider = SchemaFieldsContext.Provider;
export const useSchemaFields = () => useContext(SchemaFieldsContext);
