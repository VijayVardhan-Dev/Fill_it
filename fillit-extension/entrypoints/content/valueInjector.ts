import type { FillableField } from '../../core/types';
import { isDropdownField } from './contextExtractor';

/**
 * Use the browser's native prototype setter instead of assigning directly.
 * React and Vue wrap instance properties, so this reaches the underlying DOM
 * value and the bubbling events below let their controlled state update.
 */
export function injectNativeValue(field: FillableField, value: string): boolean {
  if (!field.isConnected || field.matches(':disabled, [readonly]')) return false;

  const elemWin = field.ownerDocument?.defaultView || window;
  const prototype = field.tagName === 'INPUT'
    ? elemWin.HTMLInputElement.prototype
    : field.tagName === 'TEXTAREA'
      ? elemWin.HTMLTextAreaElement.prototype
      : elemWin.HTMLSelectElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (!setter) return false;

  // Native selects can only take values represented by an existing option.
  if (field.tagName === 'SELECT' && !Array.from((field as HTMLSelectElement).options).some((option) => option.value === value)) {
    return false;
  }

  try {
    setter.call(field, value);
    // Some input types normalize or reject invalid values; do not report those as fills.
    if (field.value !== value) return false;

    const EventConstructor = field.ownerDocument.defaultView?.Event ?? Event;
    field.dispatchEvent(new EventConstructor('input', { bubbles: true, composed: true }));
    field.dispatchEvent(new EventConstructor('change', { bubbles: true, composed: true }));
    if (isDropdownField(field)) {
      const KeyboardEventConstructor = field.ownerDocument.defaultView?.KeyboardEvent ?? KeyboardEvent;
      field.dispatchEvent(new KeyboardEventConstructor('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true,
      }));
      field.blur();
    }
    return true;
  } catch {
    // Host pages can replace DOM methods; a failed fill should not break the page.
    return false;
  }
}
