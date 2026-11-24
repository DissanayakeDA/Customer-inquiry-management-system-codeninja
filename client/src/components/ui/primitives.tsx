import { STATUS_LABEL, type InquiryStatus } from '@inquirydesk/shared';
import type { CSSProperties, ReactNode } from 'react';
import { initials } from '@/lib/format';

export function Spinner({ label }: { label?: string }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function StatusBadge({ status, large = false }: { status: InquiryStatus; large?: boolean }) {
  return <span className={`badge badge-${status}${large ? ' badge-lg' : ''}`}>{STATUS_LABEL[status]}</span>;
}

export function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar${small ? ' avatar-sm' : ''}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Skeleton({ width = '100%', height, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <div className="skel" style={{ width, height, ...style }} />;
}

const SKELETON_WIDTHS = [60, 140, 200, 80, 110, 60];

export function SkeletonRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="skeleton-row" aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column}>
              <Skeleton width={SKELETON_WIDTHS[column % SKELETON_WIDTHS.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

interface StateBlockProps {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}

/** Centered empty / error / not-found message with an optional next step. */
export function StateBlock({ icon, title, children, action }: StateBlockProps) {
  return (
    <div className="state">
      <div className="ico">{icon}</div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, description, eyebrow, action }: { title: string; description?: ReactNode; eyebrow?: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
