import type { FillableField } from '../../core/types';

interface ShakeDetectorOptions {
  onAsk(field: FillableField): void;
  getActiveField(): FillableField | null;
  uiRoot: HTMLElement;
}

function fieldFromTarget(target: EventTarget | undefined): FillableField | null {
  if (!(target instanceof HTMLElement)) return null;
  const candidate = target.closest('input, textarea, select');
  if (!candidate || candidate.matches(':disabled, [readonly], [hidden]')) return null;
  if (candidate.tagName === 'INPUT' && !['', 'text', 'email', 'tel', 'url', 'search', 'number', 'date'].includes((candidate as HTMLInputElement).type)) return null;
  return candidate as FillableField;
}

export function listenForShakeToAsk({ onAsk, getActiveField, uiRoot }: ShakeDetectorOptions): () => void {
  let lastX = 0;
  let lastTime = 0;
  let lastDirection = 0;
  let reversals = 0;
  let lastAsk = 0;
  const onPointerMove = (event: PointerEvent) => {
    if (event.composedPath().includes(uiRoot)) return;
    const field = fieldFromTarget(event.composedPath()[0]);
    if (!field) {
      reversals = 0;
      return;
    }
    const now = performance.now();
    const dt = now - lastTime;
    const velocity = dt > 0 ? (event.clientX - lastX) / dt : 0;
    const direction = Math.sign(velocity);
    if (Math.abs(velocity) > 0.55 && direction && lastDirection && direction !== lastDirection) reversals += 1;
    else if (dt > 180) reversals = 0;
    if (reversals >= 3 && now - lastAsk > 700) {
      lastAsk = now;
      reversals = 0;
      onAsk(field);
    }
    lastX = event.clientX;
    lastTime = now;
    lastDirection = direction || lastDirection;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && event.key === '/') {
      const field = getActiveField();
      if (field) {
        event.preventDefault();
        onAsk(field);
      }
    }
  };
  document.addEventListener('pointermove', onPointerMove, true);
  document.addEventListener('keydown', onKeyDown, true);
  return () => {
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };
}
