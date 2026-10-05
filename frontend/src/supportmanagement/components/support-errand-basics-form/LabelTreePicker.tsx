import { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { Combobox, FormControl, FormErrorMessage, FormLabel } from '@sk-web-gui/react';
import {
  findLabelPath,
  getCategorizationStructure,
  getClassificationDepth,
  getClassificationDisplayName,
  getLabelDisplayName,
  getLabelsAtDepth,
  getSelectableGroupedLabels,
  getSelectableLabels,
  isLabelDeprecated,
  resolveLabelPath,
  sortLabelsByDisplayName,
} from '@supportmanagement/services/support-label-service';
import { SupportMetadata } from '@supportmanagement/services/support-metadata-service';
import { FC, ReactNode, useEffect, useMemo, useState } from 'react';

/**
 * Two comboboxes over a label tree. The first selects down to CATEGORY (a level above it becomes option
 * groups), the second everything below (SUBTYPE as options under TYPE groups):
 *
 *   KS   DEPARTMENT > CATEGORY | TYPE
 *   LOP  CATEGORY | TYPE > SUBTYPE
 *
 * Groups are never selectable; a branch that ends early is a leaf. Reports the picked path via `onChange`.
 */

const CATEGORY = 'CATEGORY';

const hasChildren = (label: Label | undefined): boolean => (label?.labels?.length ?? 0) > 0;

const getBoxLabel = (optionLabels: Label[], fallback: string, required: boolean): string => {
  const name = getClassificationDisplayName(optionLabels, '');
  return name ? `${name}${required ? '*' : ''}` : fallback;
};

const filterBySearch = (
  nodes: Label[],
  grouped: boolean,
  matches: ((label: Label) => boolean) | undefined
): Label[] => {
  if (!matches) {
    return nodes;
  }
  if (!grouped) {
    return nodes.filter(matches);
  }
  return nodes
    .map((node) => (!hasChildren(node) || matches(node) ? node : { ...node, labels: node.labels?.filter(matches) }))
    .filter((node) => matches(node) || hasChildren(node));
};

const matches = (search: string, metadata: SupportMetadata | undefined): ((label: Label) => boolean) | undefined => {
  const needle = search.trim().toLowerCase();
  return needle ? (label) => getLabelDisplayName(label, metadata).toLowerCase().includes(needle) : undefined;
};

export interface LabelTreePickerProps {
  labelStructure: Label[] | undefined;
  value: Label[] | undefined;
  onChange: (path: Label[]) => void;
  metadata: SupportMetadata | undefined;
  disabled?: boolean;
  fallbackLabels: { first: string; second: string };
  errors?: { first?: string; second?: string };
  notes?: { first?: ReactNode; second?: ReactNode };
}

export const LabelTreePicker: FC<LabelTreePickerProps> = ({
  labelStructure,
  value,
  onChange,
  metadata,
  disabled,
  fallbackLabels,
  errors,
  notes,
}) => {
  const structure = useMemo(() => getCategorizationStructure(labelStructure), [labelStructure]);
  const pivot = useMemo(() => getClassificationDepth(structure, CATEGORY) ?? 0, [structure]);

  const [selected, setSelected] = useState<Label[]>([]);
  const [firstSearch, setFirstSearch] = useState('');
  const [secondSearch, setSecondSearch] = useState('');

  useEffect(() => {
    setSelected(resolveLabelPath(structure, value));
  }, [structure, value]);

  const firstSelection = selected.length > 0 ? selected[Math.min(pivot, selected.length - 1)] : undefined;
  const secondSelection = selected.length > pivot + 1 ? selected[selected.length - 1] : undefined;
  const firstIsLeaf = !!firstSelection && !hasChildren(firstSelection);

  const keepIds = useMemo(() => selected.map((label) => label.id), [selected]);

  // `structure` keeps deprecated labels so an existing selection still resolves; only the option lists are filtered.
  const firstGrouped = pivot > 0;
  const firstNodes = useMemo(
    () =>
      sortLabelsByDisplayName(
        firstGrouped
          ? getSelectableGroupedLabels(getLabelsAtDepth(structure, pivot), keepIds)
          : getSelectableLabels(structure, keepIds)
      ),
    [structure, pivot, firstGrouped, keepIds]
  );
  const firstPathDeprecated = selected.slice(0, pivot + 1).some((label) => isLabelDeprecated(label));
  const secondNodes = useMemo(
    () => sortLabelsByDisplayName(getSelectableGroupedLabels(firstSelection?.labels, keepIds, firstPathDeprecated)),
    [firstSelection, keepIds, firstPathDeprecated]
  );

  const visibleFirst = useMemo(
    () => filterBySearch(firstNodes, firstGrouped, matches(firstSearch, metadata)),
    [firstNodes, firstGrouped, firstSearch, metadata]
  );
  const visibleSecond = useMemo(
    () => filterBySearch(secondNodes, true, matches(secondSearch, metadata)),
    [secondNodes, secondSearch, metadata]
  );

  const select = (id: string | string[] | undefined, current: Label | undefined) => {
    const value = Array.isArray(id) ? id[0] : id;
    // The combobox reports its own value back; ignore a re-select.
    if (!value || value === current?.id) {
      return;
    }
    const path = findLabelPath(structure, value);
    if (path.length === 0) {
      return;
    }
    setSelected(path);
    onChange(path);
  };

  const renderOptions = (nodes: Label[], grouped: boolean) =>
    nodes.map((node) =>
      grouped && hasChildren(node) ? (
        <Combobox.Optgroup
          key={`group-${node.id ?? node.resourcePath ?? node.resourceName}`}
          label={getLabelDisplayName(node, metadata)}
        >
          {sortLabelsByDisplayName(node.labels).map((option) => (
            <Combobox.Option value={option.id!} key={`label-${option.id ?? option.resourcePath}`}>
              {getLabelDisplayName(option, metadata)}
            </Combobox.Option>
          ))}
        </Combobox.Optgroup>
      ) : (
        <Combobox.Option value={node.id!} key={`label-${node.id ?? node.resourcePath}`}>
          {getLabelDisplayName(node, metadata)}
        </Combobox.Option>
      )
    );

  const firstPlaceholder = firstSelection
    ? selected
        .slice(0, pivot + 1)
        .map((label) => getLabelDisplayName(label, metadata))
        .filter(Boolean)
        .join(' - ')
    : 'Välj ärendekategori';
  const secondPlaceholder = secondSelection
    ? getLabelDisplayName(secondSelection, metadata)
    : firstIsLeaf
    ? 'Ingen ärendetyp'
    : 'Välj ärendetyp';

  return (
    <>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="labelCategory" className="w-full" readOnly={!metadata}>
          <FormLabel>{getBoxLabel(getLabelsAtDepth(structure, pivot + 1), fallbackLabels.first, true)}</FormLabel>
          {notes?.first}
          <Combobox
            disabled={disabled}
            data-cy="labelCategory-wrapper"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            placeholder={firstPlaceholder}
            value={firstSelection?.id ?? ''}
            onSelect={(e) => select(e.target.value, firstSelection)}
            autofilter={false}
            searchValue={firstSearch}
            onChangeSearch={(e) => setFirstSearch(e.target.value)}
          >
            <Combobox.Input
              data-cy="labelCategory-input"
              className="w-full"
              onChangeSearch={(e) => setFirstSearch(e.target.value)}
            />
            <Combobox.List data-cy="labelCategory-list" className="!max-h-[30em]">
              {renderOptions(visibleFirst, firstGrouped)}
            </Combobox.List>
          </Combobox>
          {errors?.first && (
            <div className="my-sm text-error" data-cy="labelCategory-error">
              <FormErrorMessage>{errors.first}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
      <div className="flex my-md gap-xl w-1/2">
        <FormControl id="labelType" className="w-full" readOnly={!metadata}>
          <FormLabel>
            {getBoxLabel(getLabelsAtDepth(structure, pivot + 2), fallbackLabels.second, !firstIsLeaf)}
          </FormLabel>
          {notes?.second}
          <Combobox
            disabled={disabled || !firstSelection || firstIsLeaf}
            data-cy="labelType-wrapper"
            className="w-full text-dark-primary"
            variant="primary"
            size="md"
            placeholder={secondPlaceholder}
            value={secondSelection?.id ?? ''}
            onSelect={(e) => select(e.target.value, secondSelection)}
            autofilter={false}
            searchValue={secondSearch}
            onChangeSearch={(e) => setSecondSearch(e.target.value)}
          >
            <Combobox.Input
              data-cy="labelType-input"
              className="w-full"
              onChangeSearch={(e) => setSecondSearch(e.target.value)}
            />
            <Combobox.List data-cy="labelType-list" className="!max-h-[30em]">
              {renderOptions(visibleSecond, true)}
            </Combobox.List>
          </Combobox>
          {errors?.second && (
            <div className="my-sm text-error" data-cy="labelType-error">
              <FormErrorMessage>{errors.second}</FormErrorMessage>
            </div>
          )}
        </FormControl>
      </div>
    </>
  );
};
