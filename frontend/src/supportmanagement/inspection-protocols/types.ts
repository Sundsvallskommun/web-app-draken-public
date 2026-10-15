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
  sections: ProtocolSection[];
}
