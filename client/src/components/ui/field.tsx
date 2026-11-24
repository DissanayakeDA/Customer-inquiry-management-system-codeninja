import type { ReactNode } from 'react';

/** Accessibility wiring handed to the input so label, hint and error are announced together. */
export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-required'?: boolean;
  'aria-describedby'?: string;
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  /** Rendered at the end of the label row, e.g. a character counter. */
  aside?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({ id, label, required, hint, error, aside, className, children }: FieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['field', error ? 'has-error' : '', className ?? ''].filter(Boolean).join(' ')}>
      <div className="field-row">
        <label htmlFor={id}>
          {label}
          {required && (
            <span className="req" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {aside}
      </div>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-required': required || undefined, 'aria-describedby': describedBy })}
      {error && (
        <div className="error" id={errorId}>
          {error}
        </div>
      )}
      {hint && (
        <div className="hint" id={hintId}>
          {hint}
        </div>
      )}
    </div>
  );
}
