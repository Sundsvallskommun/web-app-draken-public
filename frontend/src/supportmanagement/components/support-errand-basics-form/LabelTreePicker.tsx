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

type LabelTreeFirstLevel = 'CATEGORY' | 'DEPARTMENT';

const PLACEHOLDERS: Record<LabelTreeFirstLevel, { first: string; second: string }> = {
  CATEGORY: { first: 'Välj ärendekategori', second: 'Välj ärendetyp' },
  DEPARTMENT: { first: 'Välj verksamhet', second: 'Välj ärendekategori' },
};
const THIRD_PLACEHOLDER = 'Välj ärendetyp';
const THIRD_FALLBACK_LABEL = 'Ärendetyp*';

const hasChildren = (label: Label | undefined): boolean => (label?.labels?.length ?? 0) > 0;

const getBoxLabel = (optionLabels: Label[], fallback: string, required: boolean): string => {
  const name = getClassificationDisplayName(optionLabels, '');
  const suffix = required ? '*' : '';
  return name ? `${name}${suffix}` : fallback;
};

/** A box label, with an optional addon (e.g. a marker) on the same line. */
const BoxLabel: FC<{ text: string; addon?: ReactNode }> = ({ text, addon }) =>
  addon ? (
    <div className="flex items-center gap-8">
      <FormLabel>{text}</FormLabel>
      {addon}
    </div>
  ) : (
    <FormLabel>{text}</FormLabel>
  );

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
  fallbackLabels: { first: string; second: string; third?: string };
  errors?: { first?: string; second?: string };
  notes?: { first?: ReactNode; second?: ReactNode };
  /** Shown beside the box labels, where `notes` go below them. */
  labelAddons?: { first?: ReactNode; second?: ReactNode };
  firstLevel?: LabelTreeFirstLevel;
}

interface Box {
  id: string;
  dataCy: string;
  label: string;
  addon?: ReactNode;
  note?: ReactNode;
  placeholder: string;
  disabled: boolean;
  selection: Label | undefined;
  error?: string;
}

interface BoxOptions {
  nodes: Label[];
  grouped: boolean;
}

/** A label counts as a leaf when nothing below it can be picked any more. */
const hasSelectableChildren = (label: Label | undefined, keepIds: (string | undefined)[]): boolean =>
  getSelectableLabels(label?.labels, keepIds).length > 0;

type BoxContext = Pick<LabelTreePickerProps, 'metadata' | 'fallbackLabels' | 'errors' | 'notes' | 'labelAddons'> & {
  structure: Label[];
  selected: Label[];
  keepIds: (string | undefined)[];
  disabled: boolean;
};

/** DEPARTMENT > CATEGORY, plus a third box for TYPE when the category has types. */
const getPerLevelBoxes = (
  { structure, selected, keepIds, metadata, disabled, fallbackLabels, errors, notes, labelAddons }: BoxContext,
  showType: boolean
): Box[] => {
  const [department, category] = selected;
  const type = selected.length > 2 ? selected.at(-1) : undefined;
  const departmentIsLeaf = !!department && !hasSelectableChildren(department, keepIds);
  const categoryPlaceholder = departmentIsLeaf ? 'Ingen ärendekategori' : PLACEHOLDERS.DEPARTMENT.second;
  const result: Box[] = [
    {
      id: 'labelCategory',
      dataCy: 'labelCategory',
      label: getBoxLabel(getLabelsAtDepth(structure, 1), fallbackLabels.first, true),
      addon: labelAddons?.first,
      placeholder: department ? getLabelDisplayName(department, metadata) : PLACEHOLDERS.DEPARTMENT.first,
      disabled,
      selection: department,
      error: !department && errors?.first ? PLACEHOLDERS.DEPARTMENT.first : undefined,
    },
    {
      id: 'labelType',
      dataCy: 'labelType',
      label: getBoxLabel(getLabelsAtDepth(structure, 2), fallbackLabels.second, !departmentIsLeaf),
      addon: labelAddons?.second,
      // A legacy classification has no labels, so no type box: its type note waits here.
      note: (
        <>
          {notes?.first}
          {!showType && notes?.second}
        </>
      ),
      placeholder: category ? getLabelDisplayName(category, metadata) : categoryPlaceholder,
      disabled: disabled || !department || departmentIsLeaf,
      selection: category,
      error: department ? errors?.first : undefined,
    },
  ];
  if (showType) {
    result.push({
      id: 'labelThird',
      dataCy: 'labelThird',
      label: getBoxLabel(getLabelsAtDepth(structure, 3), fallbackLabels.third ?? THIRD_FALLBACK_LABEL, true),
      note: notes?.second,
      placeholder: type ? getLabelDisplayName(type, metadata) : THIRD_PLACEHOLDER,
      disabled,
      selection: type,
      error: errors?.second,
    });
  }
  return result;
};

/** Everything down to the CATEGORY pivot in the first box, everything below it in the second. */
const getPivotBoxes = (
  { structure, selected, metadata, disabled, fallbackLabels, errors, notes, labelAddons }: BoxContext,
  pivot: number
): Box[] => {
  const firstSelection = selected.length > 0 ? selected[Math.min(pivot, selected.length - 1)] : undefined;
  const secondSelection = selected.length > pivot + 1 ? selected.at(-1) : undefined;
  const firstIsLeaf = !!firstSelection && !hasChildren(firstSelection);

  let secondPlaceholder = PLACEHOLDERS.CATEGORY.second;
  if (secondSelection) {
    secondPlaceholder = getLabelDisplayName(secondSelection, metadata);
  } else if (firstIsLeaf) {
    secondPlaceholder = 'Ingen ärendetyp';
  }

  return [
    {
      id: 'labelCategory',
      dataCy: 'labelCategory',
      label: getBoxLabel(getLabelsAtDepth(structure, pivot + 1), fallbackLabels.first, true),
      addon: labelAddons?.first,
      note: notes?.first,
      placeholder: firstSelection
        ? selected
            .slice(0, pivot + 1)
            .map((label) => getLabelDisplayName(label, metadata))
            .filter(Boolean)
            .join(' - ')
        : PLACEHOLDERS.CATEGORY.first,
      disabled,
      selection: firstSelection,
      error: errors?.first,
    },
    {
      id: 'labelType',
      dataCy: 'labelType',
      label: getBoxLabel(getLabelsAtDepth(structure, pivot + 2), fallbackLabels.second, !firstIsLeaf),
      addon: labelAddons?.second,
      note: notes?.second,
      placeholder: secondPlaceholder,
      disabled: disabled || !firstSelection || firstIsLeaf,
      selection: secondSelection,
      error: errors?.second,
    },
  ];
};

// `structure` keeps deprecated labels so an existing selection still resolves; only the option lists are filtered.
const getBoxOptions = (
  structure: Label[],
  selected: Label[],
  keepIds: (string | undefined)[],
  perLevel: boolean,
  pivot: number
): BoxOptions[] => {
  const deprecatedUpTo = (depth: number) => selected.slice(0, depth + 1).some((label) => isLabelDeprecated(label));

  if (perLevel) {
    const [department, category] = selected;
    const result: BoxOptions[] = [
      { nodes: sortLabelsByDisplayName(getSelectableGroupedLabels(structure, keepIds)), grouped: false },
      {
        nodes: sortLabelsByDisplayName(getSelectableGroupedLabels(department?.labels, keepIds, deprecatedUpTo(0))),
        grouped: false,
      },
    ];
    if (hasChildren(category)) {
      result.push({
        nodes: sortLabelsByDisplayName(getSelectableGroupedLabels(category?.labels, keepIds, deprecatedUpTo(1))),
        grouped: true,
      });
    }
    return result;
  }

  const firstSelection = selected.length > 0 ? selected[Math.min(pivot, selected.length - 1)] : undefined;
  const firstGrouped = pivot > 0;
  return [
    {
      nodes: sortLabelsByDisplayName(
        firstGrouped
          ? getSelectableGroupedLabels(getLabelsAtDepth(structure, pivot), keepIds)
          : getSelectableLabels(structure, keepIds)
      ),
      grouped: firstGrouped,
    },
    {
      nodes: sortLabelsByDisplayName(
        getSelectableGroupedLabels(firstSelection?.labels, keepIds, deprecatedUpTo(pivot))
      ),
      grouped: true,
    },
  ];
};

export const LabelTreePicker: FC<LabelTreePickerProps> = ({
  labelStructure,
  value,
  onChange,
  metadata,
  disabled = false,
  fallbackLabels,
  errors,
  notes,
  labelAddons,
  firstLevel = 'CATEGORY',
}) => {
  const structure = useMemo(() => getCategorizationStructure(labelStructure), [labelStructure]);
  const perLevel = firstLevel === 'DEPARTMENT';
  const pivot = useMemo(() => getClassificationDepth(structure, 'CATEGORY') ?? 0, [structure]);

  const [selected, setSelected] = useState<Label[]>([]);
  const [searches, setSearches] = useState<string[]>(['', '', '']);

  useEffect(() => {
    setSelected(resolveLabelPath(structure, value));
  }, [structure, value]);

  const keepIds = useMemo(() => selected.map((label) => label.id), [selected]);

  const setSearch = (index: number, search: string) =>
    setSearches((current) => current.map((value, i) => (i === index ? search : value)));

  const select = (index: number, id: string | string[] | undefined, current: Label | undefined) => {
    const value = Array.isArray(id) ? id[0] : id;
    // The combobox reports its own value back; ignore a re-select.
    if (!value || value === current?.id) {
      return;
    }
    const path = findLabelPath(structure, value);
    if (path.length === 0) {
      return;
    }
    setSearches((current) => current.map((search, i) => (i > index ? '' : search)));
    setSelected(path);
    onChange(path);
  };

  const options = useMemo(
    () => getBoxOptions(structure, selected, keepIds, perLevel, pivot),
    [structure, selected, keepIds, perLevel, pivot]
  );

  const visibleOptions = useMemo(
    () => options.map((box, index) => filterBySearch(box.nodes, box.grouped, matches(searches[index], metadata))),
    [options, searches, metadata]
  );

  const boxContext: BoxContext = {
    structure,
    selected,
    keepIds,
    metadata,
    disabled,
    fallbackLabels,
    errors,
    notes,
    labelAddons,
  };
  const boxes = perLevel ? getPerLevelBoxes(boxContext, options.length > 2) : getPivotBoxes(boxContext, pivot);

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

  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(28rem,1fr))] gap-x-20" data-cy="label-tree-picker">
      {boxes.map((box, index) => (
        <div className="flex my-md min-w-0" key={box.id}>
          <FormControl id={box.id} className="w-full" readOnly={!metadata}>
            <BoxLabel text={box.label} addon={box.addon} />
            {box.note}
            <Combobox
              disabled={box.disabled}
              data-cy={`${box.dataCy}-wrapper`}
              className="w-full text-dark-primary"
              variant="primary"
              size="md"
              placeholder={box.placeholder}
              value={box.selection?.id ?? ''}
              onSelect={(e) => select(index, e.target.value, box.selection)}
              autofilter={false}
              searchValue={searches[index]}
              onChangeSearch={(e) => setSearch(index, e.target.value)}
            >
              <Combobox.Input
                disabled={box.disabled}
                data-cy={`${box.dataCy}-input`}
                className="w-full"
                onChangeSearch={(e) => setSearch(index, e.target.value)}
              />
              <Combobox.List data-cy={`${box.dataCy}-list`} data-position="under" className="!max-h-[30em]">
                {renderOptions(visibleOptions[index], options[index].grouped)}
              </Combobox.List>
            </Combobox>
            {box.error && (
              <div className="my-sm text-error" data-cy={`${box.dataCy}-error`}>
                <FormErrorMessage>{box.error}</FormErrorMessage>
              </div>
            )}
          </FormControl>
        </div>
      ))}
    </div>
  );
};
