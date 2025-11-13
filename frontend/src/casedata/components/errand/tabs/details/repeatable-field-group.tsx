import { isErrandLocked } from '@casedata/services/casedata-errand-service';
import { EXTRAPARAMETER_SEPARATOR, UppgiftField } from '@casedata/services/casedata-extra-parameters-service';
import { useAppContext } from '@contexts/app.context';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button } from '@sk-web-gui/react';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { CasedataFormFieldRenderer } from './casedata-formfield-renderer';

interface RepeatableFieldGroupProps {
  groupName: string;
  basePath: string;
  fields: UppgiftField[];
  minItems?: number;
  addButtonText?: string;
  removeButtonText?: string;
  initialData?: Record<number, Record<string, string | string[]>>;
}

export const RepeatableFieldGroup: React.FC<RepeatableFieldGroupProps> = ({
  groupName,
  basePath,
  fields,
  minItems = 1,
  addButtonText = 'Lägg till',
  removeButtonText = 'Ta bort',
  initialData,
}) => {
  const { unregister, setValue } = useFormContext();
  const { errand } = useAppContext();
  const isReadOnly = isErrandLocked(errand);
  const [itemIndices, setItemIndices] = useState<number[]>(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const indices = Object.keys(initialData)
        .map((k) => parseInt(k))
        .sort((a, b) => a - b);
      return indices;
    }
    return [0];
  });

  // Mark form as dirty by updating item count (enables Save button)
  const updateItemCount = (count: number) => {
    const fieldArrayName = basePath.replaceAll('.', EXTRAPARAMETER_SEPARATOR);
    setValue(`${fieldArrayName}${EXTRAPARAMETER_SEPARATOR}_count`, count, { shouldDirty: true });
  };

  // Set initial values from initialData to react-hook-form
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      const fieldArrayName = basePath.replaceAll('.', EXTRAPARAMETER_SEPARATOR);

      // Set values for each field individually
      // No timeout needed - fields are already registered when this runs
      Object.keys(initialData).forEach((indexStr) => {
        const index = parseInt(indexStr);
        const dataForIndex = initialData[index];

        fields.forEach((field) => {
          const fieldKey = field.field.split('.').pop() || field.field;
          const formKey = `${fieldArrayName}${EXTRAPARAMETER_SEPARATOR}${index}${EXTRAPARAMETER_SEPARATOR}${fieldKey}`;
          const value = dataForIndex[fieldKey];

          if (value !== undefined) {
            setValue(formKey, value, { shouldDirty: false });
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]); // Only re-run when initialData changes (after save)

  const handleAdd = () => {
    const newIndex = itemIndices.length > 0 ? Math.max(...itemIndices) + 1 : 0;
    const newIndices = [...itemIndices, newIndex];
    setItemIndices(newIndices);
    updateItemCount(newIndices.length);
  };

  const handleRemove = (index: number) => {
    if (itemIndices.length > minItems) {
      const fieldArrayName = basePath.replaceAll('.', EXTRAPARAMETER_SEPARATOR);

      fields.forEach((field) => {
        const fieldKey = field.field.split('.').pop() || field.field;
        const formKey = `${fieldArrayName}${EXTRAPARAMETER_SEPARATOR}${index}${EXTRAPARAMETER_SEPARATOR}${fieldKey}`;
        unregister(formKey);
      });

      const newIndices = itemIndices.filter((i) => i !== index);
      setItemIndices(newIndices);
      updateItemCount(newIndices.length);
    }
  };

  const getIndexedField = (field: UppgiftField, index: number): UppgiftField => {
    const fieldKey = field.field.split('.').pop() || field.field;
    const indexedFieldName = `${basePath}.${index}.${fieldKey}`;
    const actualValue = initialData?.[index]?.[fieldKey] ?? field.value;
    const indexedField: UppgiftField = {
      ...field,
      field: indexedFieldName,
      value: actualValue,
    };

    if (field.pairWith) {
      const pairKey = field.pairWith.split('.').pop() || field.pairWith;
      indexedField.pairWith = `${basePath}.${index}.${pairKey}`;
    }

    if (field.dependsOn) {
      indexedField.dependsOn = field.dependsOn.map((dep) => {
        const depKey = dep.field.split('.').pop() || dep.field;
        return {
          ...dep,
          field: `${basePath}.${index}.${depKey}`,
        };
      });
      if (field.dependsOnLogic) {
        indexedField.dependsOnLogic = field.dependsOnLogic;
      }
    }

    return indexedField;
  };

  const form = useFormContext();

  return (
    <div className="flex flex-col gap-24">
      {itemIndices.map((itemIndex, displayIndex) => (
        <div key={itemIndex} className="border border-divider rounded-md p-16 relative bg-background-color-mixin-1">
          <div className="flex justify-between items-center mb-12">
            <div className="text-md leading-24 text-dark-primary">
              {groupName} {displayIndex + 1}
            </div>
            {itemIndices.length > minItems && !isReadOnly && (
              <Button
                type="button"
                size="sm"
                variant="tertiary"
                color="error"
                onClick={() => handleRemove(itemIndex)}
                leftIcon={<LucideIcon name="trash-2" size={16} />}
              >
                {removeButtonText}
              </Button>
            )}
          </div>

          <div className="flex flex-col">
            {(() => {
              const renderedFields = new Set<string>();
              return fields.map((field, fieldIndex) => {
                const indexedField = getIndexedField(field, itemIndex);

                if (renderedFields.has(indexedField.field)) {
                  return null;
                }

                if (indexedField.pairWith) {
                  const pairedFieldTemplate = fields.find(
                    (f) => f.field.split('.').pop() === indexedField.pairWith?.split('.').pop()
                  );
                  if (pairedFieldTemplate && !renderedFields.has(indexedField.pairWith)) {
                    const pairedField = getIndexedField(pairedFieldTemplate, itemIndex);
                    renderedFields.add(indexedField.field);
                    renderedFields.add(pairedField.field);
                    return (
                      <div key={`pair-${indexedField.field}-${fieldIndex}`} className="grid grid-cols-2 gap-12 w-full">
                        <div className="min-w-0">
                          <CasedataFormFieldRenderer
                            detail={indexedField}
                            idx={fieldIndex}
                            form={form}
                            errand={errand}
                          />
                        </div>
                        <div className="min-w-0">
                          <CasedataFormFieldRenderer
                            detail={pairedField}
                            idx={fieldIndex}
                            form={form}
                            errand={errand}
                          />
                        </div>
                      </div>
                    );
                  }
                }

                renderedFields.add(indexedField.field);
                return (
                  <CasedataFormFieldRenderer
                    key={`${indexedField.field}-${fieldIndex}`}
                    detail={indexedField}
                    idx={fieldIndex}
                    form={form}
                    errand={errand}
                  />
                );
              });
            })()}
          </div>
        </div>
      ))}

      {!isReadOnly && (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            leftIcon={<LucideIcon name="plus" size={16} />}
          >
            {addButtonText}
          </Button>
        </div>
      )}
    </div>
  );
};
