export interface TemplateSelector {
  identifier?: string;
  content?: string;
  parameters?: { [key: string]: string } | { [key: string]: Object };
}

export interface Render {
  output: string;
}

export interface Template {
  identifier: string;
  name: string;
  description: string;
  metadata: [
    {
      key: string;
      value: string;
    }
  ];
  defaultValues: [
    {
      fieldName: string;
      value: string;
    }
  ];
  content: string;
}
