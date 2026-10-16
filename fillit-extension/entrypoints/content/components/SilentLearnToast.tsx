import type { MouseEvent as ReactMouseEvent } from 'react';

interface SilentLearnToastProps {
  label: string;
  value: string;
  onSave(): void;
  onDismiss(): void;
}

export function SilentLearnToast({ label, value, onSave, onDismiss }: SilentLearnToastProps) {
  const preventFocusSteal = (event: ReactMouseEvent<HTMLButtonElement>) => event.preventDefault();
  return (
    <aside className="fillit-learn-toast" role="status">
      <div className="fillit-learn-toast__icon">✦</div>
      <div className="fillit-learn-toast__body">
        <strong>Remember this field?</strong>
        <span>{label}: {value}</span>
      </div>
      <button type="button" onMouseDown={preventFocusSteal} onClick={onSave}>Save</button>
      <button type="button" aria-label="Dismiss" onMouseDown={preventFocusSteal} onClick={onDismiss}>×</button>
    </aside>
  );
}
