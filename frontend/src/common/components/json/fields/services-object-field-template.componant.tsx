import type { ObjectFieldTemplateProps } from '@rjsf/utils';

// ServicesObjectFieldTemplate - Custom layout template for service forms

export function ServicesObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { properties, uiSchema } = props;
  const uiOrder = (uiSchema?.['ui:order'] as string[] | undefined) || [];

  // Sort properties according to ui:order
  let sortedProperties = [...properties];
  if (uiOrder && uiOrder.length > 0) {
    sortedProperties.sort((a, b) => {
      const indexA = uiOrder.indexOf(a.name);
      const indexB = uiOrder.indexOf(b.name);
      // Both have index, sort by index
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // Only A has index, A comes first
      if (indexA !== -1) return -1;
      // Only B has index, B comes first
      if (indexB !== -1) return 1;
      return properties.indexOf(a) - properties.indexOf(b);
    });
  }

  const rendered: any[] = [];
  let pairedGroup: any[] = [];

  for (let i = 0; i < sortedProperties.length; i++) {
    const field = sortedProperties[i];
    const fieldUiSchema = uiSchema?.[field.name];
    const options = (fieldUiSchema as any)?.['ui:options'] as any;
    const layout = options?.layout as string | undefined;
    const isPaired = layout === 'paired';

    if (isPaired) {
      pairedGroup.push(field);
      if (pairedGroup.length === 2) {
        rendered.push(
          <div key={`paired-group-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-[2.4rem] w-full">
            {pairedGroup.map((f) => (
              <div key={f.name} className="w-full">
                {f.content}
              </div>
            ))}
          </div>
        );
        pairedGroup = [];
      }
    } else {
      if (pairedGroup.length > 0) {
        rendered.push(
          <div key={`paired-group-${i - 1}`} className="grid grid-cols-1 md:grid-cols-2 gap-[2.4rem] w-full">
            {pairedGroup.map((f) => (
              <div key={f.name} className="w-full">
                {f.content}
              </div>
            ))}
          </div>
        );
        pairedGroup = [];
      }
      rendered.push(
        <div key={field.name} className="w-full">
          {field.content}
        </div>
      );
    }
  }

  if (pairedGroup.length > 0) {
    rendered.push(
      <div key="paired-group-final" className="grid grid-cols-1 md:grid-cols-2 gap-[2.4rem] w-full">
        {pairedGroup.map((f) => (
          <div key={f.name} className="w-full">
            {f.content}
          </div>
        ))}
      </div>
    );
  }

  return <div className="w-full max-w-[96rem] flex flex-col gap-[3.2rem]">{rendered}</div>;
}
