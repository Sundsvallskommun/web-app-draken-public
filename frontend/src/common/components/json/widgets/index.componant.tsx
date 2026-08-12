import type { RegistryWidgetsType } from '@rjsf/utils';

import { CheckboxGroupWidget } from './checkbox-group-widget.componant';
import { CheckboxWidget } from './checkbox-widget.componant';
import { ComboboxWidget } from './combobox-widget.componant';
import { DateWidget } from './date-widget.componant';
import { RadiobuttonWidget } from './radio-widget.componant';
import { TexteditorWidget } from './richtext-widget.componant';
import { SelectWidget } from './select-widget.componant';
import { TextWidget } from './text-widget.componant';
import { TextareaWidget } from './textarea-widget.componant';

const baseWidgets = {
  TextWidget,
  SelectWidget,
  RadiobuttonWidget,
  CheckboxWidget,
  CheckboxGroupWidget,
  DateWidget,
  ComboboxWidget,
  TexteditorWidget,
  TextareaWidget,
} satisfies RegistryWidgetsType;

export const jsonWidgets = {
  ...baseWidgets,
  // Aliases used by uiSchema payloads from external JSON schema service
  RadioWidget: baseWidgets.RadiobuttonWidget,
  text: baseWidgets.TextWidget,
  select: baseWidgets.SelectWidget,
  radio: baseWidgets.RadiobuttonWidget,
  radiobutton: baseWidgets.RadiobuttonWidget,
  checkbox: baseWidgets.CheckboxWidget,
  checkboxes: baseWidgets.CheckboxGroupWidget,
  checkboxGroup: baseWidgets.CheckboxGroupWidget,
  'checkbox-group': baseWidgets.CheckboxGroupWidget,
  date: baseWidgets.DateWidget,
  combobox: baseWidgets.ComboboxWidget,
  texteditor: baseWidgets.TexteditorWidget,
  textarea: baseWidgets.TextareaWidget,
} satisfies RegistryWidgetsType;
