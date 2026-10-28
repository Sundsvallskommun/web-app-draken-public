/** What a field can be filled with before the handler types: the date, the permit holder, the signed-in user. */
export type ProtocolPrefill = 'today' | 'permitHolderName' | 'permitHolderOrgNumber' | 'inspector';

export interface ProtocolTextField {
  kind: 'text' | 'date' | 'time' | 'textarea';
  /** The template parameter the value is sent as. */
  key: string;
  label: string;
  prefill?: ProtocolPrefill;
  /** A short input instead of the full width. */
  narrow?: boolean;
}

export interface ProtocolOption {
  value: string;
  label: string;
  /** The template's box() parameter that gets "true" when the option is chosen. */
  parameter: string;
  /** Fields shown under the option while it is chosen. */
  followUp?: ProtocolTextField[];
}

/** 'choice' is one option (radio buttons), 'multi' any number of them (checkboxes). */
interface ProtocolChoiceField {
  kind: 'choice' | 'multi';
  key: string;
  label: string;
  options: ProtocolOption[];
}

export type ProtocolField = ProtocolTextField | ProtocolChoiceField;

export interface ProtocolSection {
  key: string;
  title: string;
  /** Shown before or after the control points. */
  position: 'before' | 'after';
  /** Text fields side by side on wide screens; choices always take a row of their own. */
  columns?: 1 | 2 | 4;
  fields: ProtocolField[];
}

/** An area or an item that can be observed on it; `key` is part of the template's parameter name. */
export interface ProtocolObservationOption {
  key: string;
  label: string;
}

/**
 * The observation table, one OBSERVATION measure per assessed area: the area's label as title, the result, and on
 * a deficiency the observed items' keys in resultText. The template reads them as `observation<item><area>`.
 */
export interface ProtocolObservations {
  areas: ProtocolObservationOption[];
  items: ProtocolObservationOption[];
  /** The template's box() parameters for no deficient area and for at least one. */
  remarks: { without: string; with: string };
}

/** One inspection protocol: the control points, the fields and the PDF template. Add a folder to add one. */
export interface InspectionProtocolTemplate {
  /** Saved as investigation.type. */
  key: string;
  /** Shown in the dropdown and saved as investigation.title. */
  label: string;
  /** The template's identifier in Templating, once uploaded. */
  identifier: string;
  /** Rendered directly until the template is uploaded; drop it then. */
  html?: string;
  /** The standard control points, saved as INTERNAL measures. */
  controlPoints: string[];
  observations?: ProtocolObservations;
  sections: ProtocolSection[];
}
