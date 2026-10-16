import type { FillableField } from '../../core/types';

export interface FieldInteractionHandlers {
  onField(field: FillableField): void;
  onDismiss(): void;
}

function isUiEvent(event: Event, uiRoot: HTMLElement): boolean {
  // composedPath still includes the shadow-tree nodes at the document boundary.
  return event.composedPath().includes(uiRoot);
}

function asEligibleField(target: EventTarget | undefined): FillableField | null {
  if (!target || typeof target !== 'object' || !('tagName' in target)) return null;
  const element = target as HTMLElement;
  if (typeof element.matches !== 'function' || typeof element.closest !== 'function') return null;
  if (element.matches(':disabled, [readonly], [hidden], [aria-hidden="true"]')) return null;
  if (element.closest('[data-fillit-ui-root="true"]')) return null;

  if (element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') return element as FillableField;
  if (element.tagName !== 'INPUT') return null;

  // Fields that cannot accept ordinary text are deliberately excluded.
  const supportedTypes = new Set(['', 'text', 'email', 'tel', 'url', 'search', 'number', 'date']);
  return supportedTypes.has((element as HTMLInputElement).type.toLowerCase())
    ? element as FillableField
    : null;
}

/** Capture early so focusin and mousedown work consistently with SPA forms and accessible iframes. */
export function listenForFieldInteractions(
  uiRoot: HTMLElement,
  handlers: FieldInteractionHandlers,
): () => void {
  const onFocusIn = (event: FocusEvent) => {
    if (isUiEvent(event, uiRoot)) return;
    const field = asEligibleField(event.composedPath()[0]);
    if (field) handlers.onField(field);
    else handlers.onDismiss();
  };

  const onMouseDown = (event: MouseEvent) => {
    if (isUiEvent(event, uiRoot)) return;
    const field = asEligibleField(event.composedPath()[0]);
    if (field) handlers.onField(field);
    else handlers.onDismiss();
  };

  const attachedWindows = new WeakSet<Window>();
  const attachedWindowList: Window[] = [];
  const attachToWindow = (frameWindow: Window) => {
    if (attachedWindows.has(frameWindow)) return;
    frameWindow.addEventListener('focusin', onFocusIn, true);
    frameWindow.addEventListener('mousedown', onMouseDown, true);
    attachedWindows.add(frameWindow);
    attachedWindowList.push(frameWindow);
  };

  const attachToAccessibleIframes = () => {
    for (const iframe of Array.from(document.querySelectorAll('iframe'))) {
      try {
        if (iframe.contentDocument && iframe.contentWindow) attachToWindow(iframe.contentWindow);
      } catch {
        // Cross-origin frames are intentionally ignored.
      }
    }
  };

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('mousedown', onMouseDown, true);
  attachToWindow(window);
  attachToAccessibleIframes();

  const iframeObserver = new MutationObserver(attachToAccessibleIframes);
  iframeObserver.observe(document.documentElement, { childList: true, subtree: true });

  return () => {
    iframeObserver.disconnect();
    for (const frameWindow of attachedWindowList) {
      frameWindow.removeEventListener('focusin', onFocusIn, true);
      frameWindow.removeEventListener('mousedown', onMouseDown, true);
    }
  };
}
