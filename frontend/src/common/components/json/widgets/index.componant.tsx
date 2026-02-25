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
  DateWidget,
  ComboboxWidget,
  TexteditorWidget,
  TextareaWidget,
};

export const jsonWidgets = {
  ...baseWidgets,
  // Aliases used by uiSchema payloads from external JSON schema service
  RadioWidget: baseWidgets.RadiobuttonWidget,
  text: baseWidgets.TextWidget,
  select: baseWidgets.SelectWidget,
  radio: baseWidgets.RadiobuttonWidget,
  radiobutton: baseWidgets.RadiobuttonWidget,
  checkbox: baseWidgets.CheckboxWidget,
  date: baseWidgets.DateWidget,
  combobox: baseWidgets.ComboboxWidget,
  texteditor: baseWidgets.TexteditorWidget,
  textarea: baseWidgets.TextareaWidget,
};
