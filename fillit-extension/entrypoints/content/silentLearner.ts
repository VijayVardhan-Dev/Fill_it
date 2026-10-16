import type { FillableField, KnowledgeGraph } from '../../core/types';

function labelFor(field: FillableField): string {
  return field.getAttribute('aria-label') ||
    field.getAttribute('name') ||
    field.getAttribute('placeholder') ||
    field.id ||
    'Custom field';
}

export function watchSilentLearning(
  graph: KnowledgeGraph,
  onUnknown: (field: FillableField, label: string, value: string) => void,
): () => void {
  const timers = new WeakMap<FillableField, number>();
  const onInput = (event: Event) => {
    const field = event.target as FillableField | null;
    if (!field || !('value' in field) || !field.isConnected) return;
    const value = field.value.trim();
    if (!value) return;
    const label = labelFor(field);
    const knownValues = graph.personas.flatMap((persona) => Object.values(persona.profile))
      .concat(graph.learnedFields.map((item) => item.value));
    if (knownValues.includes(value)) return;
    const previous = timers.get(field);
    if (previous) window.clearTimeout(previous);
    timers.set(field, window.setTimeout(() => onUnknown(field, label, value), 850));
  };
  document.addEventListener('input', onInput, true);
  return () => {
    document.removeEventListener('input', onInput, true);
  };
}
