// @vitest-environment jsdom
import type { Label } from '@common/data-contracts/supportmanagement/data-contracts';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createContext, FC, ReactNode, useContext } from 'react';
import { afterEach, expect, test, vi } from 'vitest';

import { LabelTreePicker } from './LabelTreePicker';

vi.mock('@sk-web-gui/react', () => {
  const SelectContext = createContext<(value: string) => void>(() => {});
  const Combobox = ({
    children,
    placeholder,
    disabled,
    onSelect,
    searchValue,
    'data-cy': dataCy,
  }: {
    children: ReactNode;
    placeholder?: string;
    searchValue?: string;
    disabled?: boolean;
    onSelect: (e: { target: { value: string } }) => void;
    'data-cy'?: string;
  }) => (
    <SelectContext.Provider value={(value) => onSelect({ target: { value } })}>
      <div
        data-testid={dataCy}
        data-placeholder={placeholder}
        data-search={searchValue}
        data-disabled={String(!!disabled)}
      >
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
  const Input: FC<{ onChangeSearch?: (e: { target: { value: string } }) => void }> = ({ onChangeSearch }) => (
    <input onChange={(e) => onChangeSearch?.({ target: { value: e.target.value } })} />
  );
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

test('with firstLevel DEPARTMENT a department with only deprecated categories is not offered', () => {
  const closed = label('DEPARTMENT', 'CLOSED', 'Nedlagd', [
    { ...label('CATEGORY', 'CLOSED/OLD', 'Gammal'), deprecated: true },
  ]);
  const structure = [iaf, vof, closed];
  render(
    <LabelTreePicker
      labelStructure={structure}
      value={[]}
      onChange={vi.fn()}
      metadata={{ labels: { labelStructure: structure } } as never}
      fallbackLabels={{ first: 'Verksamhet*', second: 'Ärendekategori*' }}
      firstLevel="DEPARTMENT"
    />
  );

  expect(optionNames('labelCategory-list')).toEqual(['IAF', 'VoF']);
});

test('with firstLevel DEPARTMENT picking above clears the searches of the boxes below', () => {
  renderPicker({ firstLevel: 'DEPARTMENT', value: [vof, supportAndCare] });

  const search = (testId: string) => screen.getByTestId(testId).dataset.search;
  const type = (testId: string, text: string) =>
    fireEvent.change(within(screen.getByTestId(testId)).getByRole('textbox'), { target: { value: text } });
  type('labelType-wrapper', 'hem');
  type('labelThird-wrapper', 'grupp');
  expect(search('labelType-wrapper')).toBe('hem');

  fireEvent.click(screen.getByRole('button', { name: 'IAF' }));

  expect(search('labelCategory-wrapper')).toBe('');
  expect(search('labelType-wrapper')).toBe('');
});

test('with firstLevel DEPARTMENT the legacy notes follow the category and type boxes', () => {
  const notes = { first: <p>Tidigare kategori</p>, second: <p>Tidigare typ</p> };

  renderPicker({ firstLevel: 'DEPARTMENT', notes });
  expect(within(screen.getByTestId('labelType-wrapper').parentElement!).getByText('Tidigare kategori')).toBeTruthy();
  expect(within(screen.getByTestId('labelType-wrapper').parentElement!).getByText('Tidigare typ')).toBeTruthy();
  cleanup();

  renderPicker({ firstLevel: 'DEPARTMENT', notes, value: [vof, supportAndCare] });
  expect(within(screen.getByTestId('labelType-wrapper').parentElement!).queryByText('Tidigare typ')).toBeNull();
  expect(within(screen.getByTestId('labelThird-wrapper').parentElement!).getByText('Tidigare typ')).toBeTruthy();
});

test('with firstLevel DEPARTMENT a type error never shows under the category box', () => {
  renderPicker({ firstLevel: 'DEPARTMENT', errors: { second: 'Välj ärendetyp' }, value: [vof] });

  expect(errorText('labelType-error')).toBeNull();
});
