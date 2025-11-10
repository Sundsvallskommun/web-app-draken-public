import type { RJSFSchema, RJSFValidationError } from '@rjsf/utils';

type RequiredParams = { missingProperty: string };
type LimitParams = { limit: number };
type PatternParams = { pattern: string };
type FormatParams = { format: string };

const isRequiredError = (e: RJSFValidationError): e is RJSFValidationError & { params: RequiredParams } => {
  const p = e.params as unknown;
  return e.name === 'required' && !!p && typeof (p as RequiredParams).missingProperty === 'string';
};

const hasLimit = (e: RJSFValidationError): e is RJSFValidationError & { params: LimitParams } => {
  const p = e.params as unknown;
  return !!p && typeof (p as LimitParams).limit === 'number';
};

const hasPattern = (e: RJSFValidationError): e is RJSFValidationError & { params: PatternParams } => {
  const p = e.params as unknown;
  return !!p && typeof (p as PatternParams).pattern === 'string';
};

const hasFormat = (e: RJSFValidationError): e is RJSFValidationError & { params: FormatParams } => {
  const p = e.params as unknown;
  return !!p && typeof (p as FormatParams).format === 'string';
};

export function createJsonErrorTransformer(schema: RJSFSchema) {
  return (errors: RJSFValidationError[]): RJSFValidationError[] =>
    errors.map((e) => {
      // Extract field name from property path (e.g., ".type" -> "type")
      const fieldName = e.property?.replace(/^\./, '') ?? '';
      const fieldSchema = fieldName ? (schema.properties?.[fieldName] as RJSFSchema | undefined) : undefined;
      const fieldTitle = fieldSchema?.title ?? fieldName;

      if (isRequiredError(e)) {
        const key = e.params.missingProperty;
        const title = (schema.properties?.[key] as RJSFSchema | undefined)?.title ?? key;
        return { ...e, message: `Vänligen ange ${title}.` };
      }

      if (e.name === 'minLength' && hasLimit(e)) return { ...e, message: `Ange minst ${e.params.limit} tecken.` };
      if (e.name === 'maxLength' && hasLimit(e)) return { ...e, message: `Ange högst ${e.params.limit} tecken.` };

      if (e.name === 'minItems' && hasLimit(e)) return { ...e, message: `Välj minst ${e.params.limit} alternativ.` };
      if (e.name === 'maxItems' && hasLimit(e)) return { ...e, message: `Välj högst ${e.params.limit} alternativ.` };

      if (e.name === 'minimum' && hasLimit(e))
        return { ...e, message: `Värdet måste vara större eller lika med ${e.params.limit}.` };
      if (e.name === 'maximum' && hasLimit(e))
        return { ...e, message: `Värdet måste vara mindre eller lika med ${e.params.limit}.` };

      if (e.name === 'pattern' && hasPattern(e)) {
        return { ...e, message: `Värdet matchar inte det förväntade formatet.` };
      }

      if (e.name === 'format' && hasFormat(e)) {
        const f = e.params.format;
        if (f === 'email') return { ...e, message: 'Ange en giltig e-postadress.' };
        if (f === 'uri' || f === 'url') return { ...e, message: 'Ange en giltig länk (URL).' };
        if (f === 'date') return { ...e, message: 'Ange ett datum i giltigt format (ÅÅÅÅ-MM-DD).' };
        if (f === 'date-time') return { ...e, message: 'Ange datum och tid i giltigt format.' };
        return { ...e, message: `Värdet matchar inte formatet "${f}".` };
      }

      if (e.name === 'enum' || e.name === 'not') {
        return { ...e, message: `Vänligen ange ${fieldTitle}.` };
      }

      return e;
    });
}

export default createJsonErrorTransformer;
