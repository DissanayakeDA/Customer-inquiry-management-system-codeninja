'use client';

import type { InquiryDto, UserSummary } from '@inquirydesk/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDateTime, timeAgo } from '@/lib/format';
import { Avatar, SkeletonRows, StatusBadge } from '../ui/primitives';

export function AssigneeCell({ assignee, currentUserId }: { assignee: UserSummary | null; currentUserId: number }) {
  if (!assignee) return <span className="unassigned">Unassigned</span>;
  return (
    <span className="assignee">
      <Avatar name={assignee.name} small />
      {assignee.name}
      {assignee.id === currentUserId && <span className="faint"> (you)</span>}
    </span>
  );
}

const HEAD = (
  <thead>
    <tr>
      <th scope="col">Ref</th>
      <th scope="col">Customer</th>
      <th scope="col">Subject</th>
      <th scope="col">Status</th>
      <th scope="col">Assigned to</th>
      <th scope="col">Updated</th>
    </tr>
  </thead>
);

export function InquiryTableSkeleton() {
  return (
    <div className="table-wrap">
      <table aria-busy="true">
        {HEAD}
        <tbody>
          <SkeletonRows rows={6} columns={6} />
        </tbody>
      </table>
    </div>
  );
}

export function InquiryTable({ items, currentUserId, dimmed }: { items: InquiryDto[]; currentUserId: number; dimmed?: boolean }) {
  const router = useRouter();

  return (
    <div className="table-wrap">
      <table className={dimmed ? 'dim' : undefined} aria-busy={dimmed || undefined}>
        <caption className="sr-only">Inquiries, most recently updated first</caption>
        {HEAD}
        <tbody>
          {items.map((inquiry) => (
            // The whole row is clickable for mouse users; the reference link is the keyboard/screen-reader target.
            <tr key={inquiry.id} className="clickable" onClick={() => router.push(`/inquiries/${inquiry.id}`)}>
              <td className="mono">
                <Link href={`/inquiries/${inquiry.id}`} onClick={(event) => event.stopPropagation()}>
                  {inquiry.reference}
                </Link>
              </td>
              <td>
                {inquiry.customerName}
                <span className="sub">{inquiry.contact}</span>
              </td>
              <td className="subject" title={inquiry.subject}>
                {inquiry.subject}
              </td>
              <td>
                <StatusBadge status={inquiry.status} />
              </td>
              <td>
                <AssigneeCell assignee={inquiry.assignedTo} currentUserId={currentUserId} />
              </td>
              <td className="muted" title={formatDateTime(inquiry.updatedAt)}>
                {timeAgo(inquiry.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
