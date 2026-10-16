import type { FieldContext, FillableField } from '../../core/types';

const GEOMETRIC_CANDIDATES = [
  'label', 'legend', '[aria-label]', '[role="heading"]',
  'h1', 'h2', 'h3', 'h4', 'p', 'span', 'strong', 'small', 'dt', 'th',
  '[data-label]', '[data-field-label]',
].join(',');

const SECTION_LANDMARKS = [
  'fieldset', 'form', 'section', 'article', 'main', 'dialog',
  '[role="group"]', '[role="dialog"]', '[aria-label]',
].join(',');

function cleanText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function isDropdownField(field: FillableField): boolean {
  const role = field.getAttribute('role')?.toLowerCase();
  const ariaHasPopup = field.getAttribute('aria-haspopup')?.toLowerCase();
  return field.tagName === 'SELECT' ||
    role === 'combobox' ||
    role === 'listbox' ||
    ariaHasPopup === 'listbox' ||
    Boolean(field.closest('[role="combobox"], [aria-haspopup="listbox"]'));
}

function addUnique(items: string[], value: string | null | undefined): void {
  const normalized = cleanText(value);
  if (normalized && !items.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
    items.push(normalized);
  }
}

/** Resolve ARIA references in the field's tree, including Shadow Roots. */
function getReferencedText(field: FillableField, id: string): string | null {
  const root = field.getRootNode();
  if (root && ((root as Node).nodeType === Node.DOCUMENT_NODE || (root as Node).nodeType === Node.DOCUMENT_FRAGMENT_NODE)) {
    return (root as Document | ShadowRoot).getElementById(id)?.textContent ?? null;
  }
  return field.ownerDocument.getElementById(id)?.textContent ?? null;
}

function getExplicitText(field: FillableField): string[] {
  const items: string[] = [];

  // Native label associations work for input, textarea, and select elements.
  for (const label of Array.from(field.labels ?? [])) addUnique(items, label.innerText || label.textContent);

  const labelledBy = field.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      addUnique(items, getReferencedText(field, id));
    }
  }

  for (const attribute of ['aria-label', 'placeholder', 'name', 'id', 'title', 'autocomplete']) {
    addUnique(items, field.getAttribute(attribute));
  }

  const legend = field.closest('fieldset')?.querySelector('legend');
  if (legend) addUnique(items, legend.innerText || legend.textContent);
  return items;
}

function rectDistance(a: DOMRect, b: DOMRect): { x: number; y: number } {
  const x = Math.max(0, a.left - b.right, b.left - a.right);
  const y = Math.max(0, a.top - b.bottom, b.top - a.bottom);
  return { x, y };
}

function getNearbyText(field: FillableField): string[] {
  const items: string[] = [];
  const fieldRect = field.getBoundingClientRect();
  const root = field.getRootNode();
  const isDocumentOrFragment = root &&
    ((root as Node).nodeType === Node.DOCUMENT_NODE || (root as Node).nodeType === Node.DOCUMENT_FRAGMENT_NODE);
  const fallbackScope = isDocumentOrFragment
    ? root as Document | ShadowRoot
    : field.ownerDocument.body;
  const scope: ParentNode | null = field.closest(SECTION_LANDMARKS) ?? fallbackScope;
  if (!scope) return items;

  // Bound work on large forms and only keep text geometrically close to this field.
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(GEOMETRIC_CANDIDATES)).slice(0, 500);
  const nearby = candidates
    .filter((candidate) => candidate !== field && !candidate.contains(field))
    .map((candidate) => {
      const text = cleanText(candidate.innerText || candidate.getAttribute('aria-label') || candidate.textContent);
      const rect = candidate.getBoundingClientRect();
      const distance = rectDistance(fieldRect, rect);
      // Ignore hidden nodes: their zero-position text can otherwise look nearby.
      const style = candidate.ownerDocument.defaultView?.getComputedStyle(candidate);
      const visible = candidate.getClientRects().length > 0 &&
        style?.display !== 'none' && style?.visibility !== 'hidden';
      return { text, visible, distance: distance.x + distance.y * 1.4 };
    })
    .filter(({ text, visible, distance }) => text && visible && distance < 360)
    .sort((a, b) => a.distance - b.distance);

  for (const candidate of nearby.slice(0, 8)) addUnique(items, candidate.text);
  return items;
}

function getSectionText(field: FillableField): string[] {
  const items: string[] = [];
  let ancestor = field.parentElement;
  let depth = 0;

  // Section ring uses semantic landmarks and their headings, never sibling field values.
  while (ancestor && depth < 5) {
    if (ancestor.matches(SECTION_LANDMARKS)) {
      addUnique(items, ancestor.getAttribute('aria-label'));
      const labelledBy = ancestor.getAttribute('aria-labelledby');
      if (labelledBy) {
        for (const id of labelledBy.split(/\s+/)) {
          addUnique(items, getReferencedText(field, id));
        }
      }
      for (const heading of Array.from(ancestor.querySelectorAll<HTMLElement>(
        ':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > [role="heading"], [data-section-title]',
      )).slice(0, 3)) {
        addUnique(items, heading.innerText || heading.textContent);
      }
    }
    ancestor = ancestor.parentElement;
    depth += 1;
  }
  return items;
}

function getHelperAndErrorText(field: FillableField): { helperText: string[]; errorText: string[] } {
  const helperText: string[] = [];
  const errorText: string[] = [];
  const describedBy = field.getAttribute('aria-describedby');
  if (describedBy) {
    for (const id of describedBy.split(/\s+/)) {
      const node = getReferencedText(field, id);
      if (node) {
        const target = field.ownerDocument.getElementById(id);
        (target?.matches('[role="alert"], .error, [class*="error" i]') ? errorText : helperText).push(cleanText(node));
      }
    }
  }
  for (const candidate of Array.from(field.parentElement?.querySelectorAll<HTMLElement>('[role="alert"], .error, [class*="error" i]') ?? []).slice(0, 3)) {
    addUnique(errorText, candidate.innerText || candidate.textContent);
  }
  return { helperText, errorText };
}

/** Extract only labels and nearby page copy; input values are intentionally never read. */
export function extractFieldContext(field: FillableField): FieldContext {
  const fieldType = field.tagName === 'INPUT' ? field.type : field.tagName === 'SELECT' ? 'select-one' : 'textarea';
  const helperAndError = getHelperAndErrorText(field);
  return {
    fieldType,
    isDropdownField: isDropdownField(field),
    autocomplete: cleanText(field.getAttribute('autocomplete')).toLowerCase(),
    name: cleanText(field.getAttribute('name')),
    id: cleanText(field.id),
    explicitText: getExplicitText(field),
    nearbyText: getNearbyText(field),
    sectionText: getSectionText(field),
    ...helperAndError,
    pageTitle: cleanText(field.ownerDocument.title),
    pageCompany: cleanText(field.ownerDocument.querySelector('meta[property="og:site_name"], meta[name="application-name"]')?.getAttribute('content')),
  };
}
