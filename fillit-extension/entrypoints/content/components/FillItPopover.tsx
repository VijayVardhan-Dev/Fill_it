import { autoUpdate, computePosition, flip, offset, shift, size, type VirtualElement } from '@floating-ui/dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { matchGraph } from '../../../core/matcherEngine';
import type { FieldContext, FillableField, KnowledgeGraph, PersonaId, SuggestionOption } from '../../../core/types';
import { injectNativeValue } from '../valueInjector';

interface FillItPopoverProps {
  field: FillableField | null;
  context: FieldContext | null;
  graph: KnowledgeGraph | null;
  onGraphChange?(graph: KnowledgeGraph): void;
  onDismiss(): void;
}

function preventFocusSteal(event: ReactMouseEvent<HTMLButtonElement>): void {
  // Keep the host field focused until the click handler injects its value.
  event.preventDefault();
}

function createViewportReference(field: FillableField): FillableField | VirtualElement {
  if (field.ownerDocument === window.document) return field;

  const innerRect = field.getBoundingClientRect();
  let left = innerRect.left;
  let top = innerRect.top;
  let currentDocument = field.ownerDocument;

  try {
    while (currentDocument !== window.document) {
      const frame = currentDocument.defaultView?.frameElement as HTMLIFrameElement | null;
      if (!frame) break;
      const frameRect = frame.getBoundingClientRect();
      left += frameRect.left;
      top += frameRect.top;
      currentDocument = frame.ownerDocument;
    }
  } catch {
    // The field was detached or its frame became inaccessible while measuring.
  }

  return {
    getBoundingClientRect: () => new DOMRect(left, top, innerRect.width, innerRect.height),
  };
}

export function FillItPopover({ field, context, graph, onDismiss }: FillItPopoverProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [personaId, setPersonaId] = useState<PersonaId>('developer');
  const [activeIndex, setActiveIndex] = useState(0);
  const [fillError, setFillError] = useState('');
  const persona = graph?.personas.find((item) => item.id === personaId) ?? graph?.personas[0];
  const suggestions = useMemo(
    () => context && graph && persona ? matchGraph(context, graph, persona.id) : [],
    [context, graph, persona],
  );

  useEffect(() => {
    setActiveIndex(0);
    setFillError('');
  }, [field, context, personaId]);

  useEffect(() => {
    const popup = popupRef.current;
    if (!field || !popup || !suggestions.length || !field.isConnected) return;

    const updatePosition = () => {
      const reference = createViewportReference(field);
      void computePosition(reference, popup, {
        strategy: 'fixed',
        placement: context?.isDropdownField ? 'top-start' : 'bottom-start',
        middleware: [
          offset(8),
          flip({
            padding: 8,
            fallbackPlacements: context?.isDropdownField ? ['right-start'] : undefined,
          }),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply({ availableHeight, elements }) {
              elements.floating.style.maxHeight = `${Math.max(180, Math.min(420, availableHeight))}px`;
            },
          }),
        ],
      }).then(({ x, y }) => {
        // The field may be detached while an async measurement is in flight.
        if (!field.isConnected || !popup.isConnected) return;
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
      }).catch(() => {
        // A page can remove/rebuild a focused input between animation frames.
      });
    };

    return autoUpdate(field, popup, updatePosition);
  }, [field, context?.isDropdownField, suggestions.length]);

  useEffect(() => {
    if (!field || !suggestions.length) return;

    const onKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'ArrowDown' || keyboardEvent.key === 'ArrowUp') {
        keyboardEvent.preventDefault();
        const delta = keyboardEvent.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((index) => (index + delta + suggestions.length) % suggestions.length);
      } else if (keyboardEvent.key === 'Enter') {
        const option = suggestions[activeIndex];
        if (option) {
          keyboardEvent.preventDefault();
          fill(option);
        }
      } else if (keyboardEvent.key === 'Escape') {
        keyboardEvent.preventDefault();
        onDismiss();
      }
    };

    field.addEventListener('keydown', onKeyDown);
    return () => field.removeEventListener('keydown', onKeyDown);
  }, [field, suggestions, activeIndex, onDismiss]);

  function fill(option: SuggestionOption) {
    if (!field || !field.isConnected) {
      onDismiss();
      return;
    }
    if (injectNativeValue(field, option.value)) onDismiss();
    else setFillError('This control could not accept that value.');
  }

  if (!field || !context || !graph || !persona || !field.isConnected || !suggestions.length) return null;

  return (
    <section
      ref={popupRef}
      aria-label="FillIt suggestions"
      className="fillit-popover fixed z-[2147483647]"
      style={{ position: 'fixed', left: 8, top: 8 }}
    >
      <header className="fillit-popover__header">
        <div className="fillit-brand">
          <span className="fillit-brand__mark" aria-hidden="true">F</span>
          <div>
            <p className="fillit-brand__name">FillIt</p>
            <p className="fillit-brand__subtitle">
            {context.isDropdownField ? '⚡ Quick Select' : 'Choose a local profile value'}
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close suggestions"
          className="fillit-close"
          onMouseDown={preventFocusSteal}
          onClick={onDismiss}
        >
          ×
        </button>
      </header>

      {!context.isDropdownField && (
        <div className="fillit-popover__persona-bar" role="tablist" aria-label="Persona">
          {graph.personas.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={personaId === item.id}
              className="fillit-persona"
              onMouseDown={preventFocusSteal}
              onClick={() => setPersonaId(item.id)}
              title={item.headline}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {context.isDropdownField && suggestions[0] && (
        <div className="fillit-quick-select" aria-label={`Quick select ${suggestions[0].value}`}>
          <span className="fillit-quick-select__bolt" aria-hidden="true">⚡</span>
          <span>Quick Select · {suggestions[0].value}</span>
        </div>
      )}

      <div className="fillit-popover__list" role="listbox" aria-label="Matching values">
        {suggestions.map((option, index) => (
          <button
            key={option.id}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            tabIndex={-1}
            className="fillit-option"
            onMouseDown={preventFocusSteal}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => fill(option)}
          >
            <span className="fillit-option__value">{option.value}</span>
            <span className="fillit-option__meta">
              {context.isDropdownField ? `⚡ Select: ${option.value}` : `${option.source} · click to fill`}
            </span>
          </button>
        ))}
      </div>

      <footer className="fillit-popover__footer">
        <span className="fillit-footer__keys">↑ ↓ navigate · Enter fill · Esc close</span>
        {!context.isDropdownField && <span>{persona.headline}</span>}
      </footer>
      {fillError && <p role="status" className="fillit-error">{fillError}</p>}
    </section>
  );
}
