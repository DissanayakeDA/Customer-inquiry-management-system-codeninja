import type { ReactNode } from 'react';
import { IconCheckSolid, IconErrorSolid, IconInfoSolid, IconWarnSolid } from './icons';

export type AlertTone = 'error' | 'warn' | 'info' | 'ok';

const ICONS = { error: IconErrorSolid, warn: IconWarnSolid, info: IconInfoSolid, ok: IconCheckSolid } as const;

interface AlertProps {
  tone: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}

/** Errors and warnings interrupt screen readers (role=alert); info and success are announced politely. */
export function Alert({ tone, title, children, actions }: AlertProps) {
  const Icon = ICONS[tone];
  const urgent = tone === 'error' || tone === 'warn';
  return (
    <div className={`alert alert-${tone}`} role={urgent ? 'alert' : 'status'}>
      <Icon className="alert-icon" />
      <div>
        <strong>{title}</strong>
        {children}
        {actions && <div className="alert-actions">{actions}</div>}
      </div>
    </div>
  );
}
