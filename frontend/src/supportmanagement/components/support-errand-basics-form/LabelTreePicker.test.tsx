// @vitest-environment jsdom
import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createContext, FC, ReactNode, useContext } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { LabelTreePicker } from './LabelTreePicker';

// A plain stand-in for the sk-web-gui combobox: options are buttons that report their value to `onSelect`.
vi.mock('@sk-web-gui/react', () => {
  const SelectContext = createContext<(value: string) => void>(() => {});
  const Combobox = ({
    children,
    placeholder,
    disabled,
    onSelect,
    'data-cy': dataCy,
  }: {
    children: ReactNode;
    placeholder?: string;
    disabled?: boolean;
    onSelect: (e: { target: { value: string } }) => void;
    'data-cy'?: string;
  }) => (
    <SelectContext.Provider value={(value) => onSelect({ target: { value } })}>
      <div data-testid={dataCy} data-placeholder={placeholder} data-disabled={String(!!disabled)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
  const Option: FC<{ value: string; children: ReactNode }> = ({ value, children }) => {
    const select = useContext(SelectContext);
    return (
      <button type="button" onClick={() => select(value)}>
        {children}
      </button>
    );
  };
  const Input = () => null;
  const List: FC<{ children: ReactNode; 'data-cy'?: string }> = ({ children, 'data-cy': dataCy }) => (
    <div data-testid={dataCy}>{children}</div>
  );
  const Optgroup: FC<{ label: string; children: ReactNode }> = ({ label, children }) => (
    <fieldset aria-label={label}>{children}</fieldset>
  );
  Combobox.Input = Input;
  Combobox.List = List;
  Combobox.Option = Option;
  Combobox.Optgroup = Optgroup;
  return {
    Combobox,
    FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    FormLabel: ({ children }: { children: ReactNode }) => <label>{children}</label>,
    FormErrorMessage: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

const label = (classification: string, path: string, displayName: string, labels: Label[] = []): Label => ({
  id: path,
  classification,
  displayName,
  resourceName: path.split('/').pop() ?? path,
  resourcePath: path,
  labels,
});

// The LOK tree: DEPARTMENT > CATEGORY, with TYPE below one of the categories.
const homecare = label('CATEGORY', 'VOF/HOMECARE', 'Hemtjänst');
const groupHome = label('TYPE', 'VOF/SUPPORT_AND_CARE/GROUP_HOME', 'Gruppboende');
const supportAndCare = label('CATEGORY', 'VOF/SUPPORT_AND_CARE', 'Stöd och omsorg', [groupHome]);
const vof = label('DEPARTMENT', 'VOF', 'VoF', [homecare, supportAndCare]);
const adultEducation = label('CATEGORY', 'IAF/ADULTEDUCATION', 'Vuxenutbildning');
const iaf = label('DEPARTMENT', 'IAF', 'IAF', [adultEducation]);
const labelStructure = [iaf, vof];

const renderPicker = (props: Partial<Parameters<typeof LabelTreePicker>[0]> = {}) => {
  const onChange = vi.fn();
  render(
    <LabelTreePicker
      labelStructure={labelStructure}
      value={[]}
      onChange={onChange}
      metadata={{ labels: { labelStructure } } as never}
      fallbackLabels={{ first: 'Verksamhet*', second: 'Ärendekategori*' }}
      {...props}
    />
  );
  return onChange;
};

const optionNames = (testId: string) =>
  within(screen.getByTestId(testId))
    .queryAllByRole('button')
    .map((button) => button.textContent);

const errorText = (dataCy: string) => document.querySelector(`[data-cy="${dataCy}"]`)?.textContent ?? null;

afterEach(() => {
  cleanup();
});

test('with firstLevel DEPARTMENT the first box lists the departments and the second waits for one', () => {
  renderPicker({ firstLevel: 'DEPARTMENT' });

  expect(optionNames('labelCategory-list')).toEqual(['IAF', 'VoF']);
  expect(screen.getByTestId('labelCategory-wrapper').dataset.placeholder).toBe('Välj verksamhet');
  expect(screen.getByTestId('labelType-wrapper').dataset.placeholder).toBe('Välj ärendekategori');
  expect(screen.getByTestId('labelType-wrapper').dataset.disabled).toBe('true');
});

test('with firstLevel DEPARTMENT the second box lists the categories of the picked department', () => {
  const onChange = renderPicker({ firstLevel: 'DEPARTMENT' });

  fireEvent.click(screen.getByRole('button', { name: 'VoF' }));

  expect(onChange).toHaveBeenLastCalledWith([vof]);
  expect(screen.getByTestId('labelType-wrapper').dataset.disabled).toBe('false');
  // Every category is an option of its own, also one with types below it.
  expect(optionNames('labelType-list')).toEqual(['Hemtjänst', 'Stöd och omsorg']);
  expect(screen.queryByRole('group')).toBeNull();
  expect(screen.queryByTestId('labelThird-wrapper')).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: 'Hemtjänst' }));
  expect(onChange).toHaveBeenLastCalledWith([vof, homecare]);
  expect(screen.queryByTestId('labelThird-wrapper')).toBeNull();
});

test('with firstLevel DEPARTMENT a third box for the type shows only for a category with types', () => {
  const onChange = renderPicker({ firstLevel: 'DEPARTMENT' });

  fireEvent.click(screen.getByRole('button', { name: 'VoF' }));
  fireEvent.click(screen.getByRole('button', { name: 'Stöd och omsorg' }));

  expect(onChange).toHaveBeenLastCalledWith([vof, supportAndCare]);
  expect(screen.getByTestId('labelThird-wrapper').dataset.placeholder).toBe('Välj ärendetyp');
  expect(optionNames('labelThird-list')).toEqual(['Gruppboende']);
  expect(screen.getByText('Ärendetyp*')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Gruppboende' }));
  expect(onChange).toHaveBeenLastCalledWith([vof, supportAndCare, groupHome]);
  expect(screen.getByTestId('labelThird-wrapper').dataset.placeholder).toBe('Gruppboende');

  // Back to a category without types: the third box goes away.
  fireEvent.click(screen.getByRole('button', { name: 'Hemtjänst' }));
  expect(onChange).toHaveBeenLastCalledWith([vof, homecare]);
  expect(screen.queryByTestId('labelThird-wrapper')).toBeNull();
});

test('with firstLevel DEPARTMENT an existing errand shows its department, category and type', () => {
  renderPicker({ firstLevel: 'DEPARTMENT', value: [vof, supportAndCare, groupHome] });

  expect(screen.getByTestId('labelCategory-wrapper').dataset.placeholder).toBe('VoF');
  expect(screen.getByTestId('labelType-wrapper').dataset.placeholder).toBe('Stöd och omsorg');
  expect(screen.getByTestId('labelThird-wrapper').dataset.placeholder).toBe('Gruppboende');
});

test('with firstLevel DEPARTMENT the errors show at the box where the choice is missing', () => {
  const errors = { first: 'Välj ärendekategori', second: 'Välj ärendetyp' };

  renderPicker({ firstLevel: 'DEPARTMENT', errors });
  expect(errorText('labelCategory-error')).toBe('Välj verksamhet');
  expect(errorText('labelType-error')).toBeNull();
  cleanup();

  renderPicker({ firstLevel: 'DEPARTMENT', errors: { first: errors.first }, value: [vof] });
  expect(errorText('labelCategory-error')).toBeNull();
  expect(errorText('labelType-error')).toBe('Välj ärendekategori');
  cleanup();

  renderPicker({ firstLevel: 'DEPARTMENT', errors: { second: errors.second }, value: [vof, supportAndCare] });
  expect(errorText('labelType-error')).toBeNull();
  expect(errorText('labelThird-error')).toBe('Välj ärendetyp');
});

test('by default the first box lists the categories grouped by department', () => {
  renderPicker();

  expect(optionNames('labelCategory-list')).toEqual(['Vuxenutbildning', 'Hemtjänst', 'Stöd och omsorg']);
  expect(screen.getByRole('group', { name: 'VoF' })).toBeTruthy();
  expect(screen.getByTestId('labelCategory-wrapper').dataset.placeholder).toBe('Välj ärendekategori');
  expect(screen.getByTestId('labelType-wrapper').dataset.placeholder).toBe('Välj ärendetyp');
});
