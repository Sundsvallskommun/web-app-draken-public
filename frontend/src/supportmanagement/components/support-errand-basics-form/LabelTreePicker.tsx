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
 * With `firstLevel` DEPARTMENT one box per level: DEPARTMENT, CATEGORY and, only when the picked category
 * has types, TYPE (SUBTYPE as options under TYPE groups):
 *
 *   LOK  DEPARTMENT | CATEGORY | TYPE
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
  /** `third` is only used with `firstLevel` DEPARTMENT. */
  fallbackLabels: { first: string; second: string; third?: string };
  /**
   * `first` is the category error, `second` the type error. With `firstLevel` DEPARTMENT they are shown at the box
   * where the choice is missing.
   */
  errors?: { first?: string; second?: string };
  notes?: { first?: ReactNode; second?: ReactNode };
  /** Shown beside the box labels, where `notes` go below them. */
  labelAddons?: { first?: ReactNode; second?: ReactNode };
  /** The classification the first box selects down to (default CATEGORY). */
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
  nodes: Label[];
  grouped: boolean;
  search: string;
  setSearch: (search: string) => void;
  error?: string;
}

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
  const pivot = useMemo(
    () => (perLevel ? 0 : getClassificationDepth(structure, firstLevel) ?? 0),
    [structure, firstLevel, perLevel]
  );

  const [selected, setSelected] = useState<Label[]>([]);
  const [firstSearch, setFirstSearch] = useState('');
  const [secondSearch, setSecondSearch] = useState('');
  const [thirdSearch, setThirdSearch] = useState('');

  useEffect(() => {
    setSelected(resolveLabelPath(structure, value));
  }, [structure, value]);

  const keepIds = useMemo(() => selected.map((label) => label.id), [selected]);

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

  // `structure` keeps deprecated labels so an existing selection still resolves; only the option lists are filtered.
  const boxes: Box[] = (() => {
    const deprecatedUpTo = (depth: number) => selected.slice(0, depth + 1).some((label) => isLabelDeprecated(label));

    if (perLevel) {
      const [department, category] = selected;
      const type = selected.length > 2 ? selected[selected.length - 1] : undefined;
      const departmentIsLeaf = !!department && !hasChildren(department);
      const showType = hasChildren(category);
      const categoryPlaceholder = departmentIsLeaf ? 'Ingen ärendekategori' : PLACEHOLDERS.DEPARTMENT.second;
      const result: Box[] = [
        {
          id: 'labelCategory',
          dataCy: 'labelCategory',
          label: getBoxLabel(getLabelsAtDepth(structure, 1), fallbackLabels.first, true),
          addon: labelAddons?.first,
          note: notes?.first,
          placeholder: department ? getLabelDisplayName(department, metadata) : PLACEHOLDERS.DEPARTMENT.first,
          disabled,
          selection: department,
          nodes: sortLabelsByDisplayName(getSelectableLabels(structure, keepIds)),
          grouped: false,
          search: firstSearch,
          setSearch: setFirstSearch,
          error: !department && errors?.first ? PLACEHOLDERS.DEPARTMENT.first : undefined,
        },
        {
          id: 'labelType',
          dataCy: 'labelType',
          label: getBoxLabel(getLabelsAtDepth(structure, 2), fallbackLabels.second, !departmentIsLeaf),
          addon: labelAddons?.second,
          note: notes?.second,
          placeholder: category ? getLabelDisplayName(category, metadata) : categoryPlaceholder,
          disabled: disabled || !department || departmentIsLeaf,
          selection: category,
          nodes: sortLabelsByDisplayName(getSelectableGroupedLabels(department?.labels, keepIds, deprecatedUpTo(0))),
          grouped: false,
          search: secondSearch,
          setSearch: setSecondSearch,
          error: department ? errors?.first || (!showType ? errors?.second : undefined) : undefined,
        },
      ];
      if (showType) {
        result.push({
          id: 'labelThird',
          dataCy: 'labelThird',
          label: getBoxLabel(getLabelsAtDepth(structure, 3), fallbackLabels.third ?? THIRD_FALLBACK_LABEL, true),
          placeholder: type ? getLabelDisplayName(type, metadata) : THIRD_PLACEHOLDER,
          disabled,
          selection: type,
          nodes: sortLabelsByDisplayName(getSelectableGroupedLabels(category?.labels, keepIds, deprecatedUpTo(1))),
          grouped: true,
          search: thirdSearch,
          setSearch: setThirdSearch,
          error: errors?.second,
        });
      }
      return result;
    }

    const firstSelection = selected.length > 0 ? selected[Math.min(pivot, selected.length - 1)] : undefined;
    const secondSelection = selected.length > pivot + 1 ? selected[selected.length - 1] : undefined;
    const firstIsLeaf = !!firstSelection && !hasChildren(firstSelection);
    const firstGrouped = pivot > 0;

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
        nodes: sortLabelsByDisplayName(
          firstGrouped
            ? getSelectableGroupedLabels(getLabelsAtDepth(structure, pivot), keepIds)
            : getSelectableLabels(structure, keepIds)
        ),
        grouped: firstGrouped,
        search: firstSearch,
        setSearch: setFirstSearch,
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
        nodes: sortLabelsByDisplayName(
          getSelectableGroupedLabels(firstSelection?.labels, keepIds, deprecatedUpTo(pivot))
        ),
        grouped: true,
        search: secondSearch,
        setSearch: setSecondSearch,
        error: errors?.second,
      },
    ];
  })();

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

  // Equal columns sharing the row; when it gets too narrow a box wraps below, as wide as the ones above.
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(28rem,1fr))] gap-x-20" data-cy="label-tree-picker">
      {boxes.map((box) => (
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
              onSelect={(e) => select(e.target.value, box.selection)}
              autofilter={false}
              searchValue={box.search}
              onChangeSearch={(e) => box.setSearch(e.target.value)}
            >
              <Combobox.Input
                disabled={box.disabled}
                data-cy={`${box.dataCy}-input`}
                className="w-full"
                onChangeSearch={(e) => box.setSearch(e.target.value)}
              />
              <Combobox.List data-cy={`${box.dataCy}-list`} data-position="under" className="!max-h-[30em]">
                {renderOptions(filterBySearch(box.nodes, box.grouped, matches(box.search, metadata)), box.grouped)}
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
