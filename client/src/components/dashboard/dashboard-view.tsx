'use client';

import { INQUIRY_STATUSES, STATUS_LABEL, type DashboardResponse, type InquiryStatus } from '@inquirydesk/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/hooks/use-inquiries';
import { errorMessage } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useCurrentUser } from '../session/session-context';
import { IconInbox, IconWarningCircle } from '../ui/icons';
import { PageHeader, Skeleton, SkeletonRows, StateBlock, StatusBadge } from '../ui/primitives';

const STATUS_COLOR: Readonly<Record<InquiryStatus, string>> = {
  new: 'var(--s-new)',
  in_progress: 'var(--s-prog-bar)',
  resolved: 'var(--s-res-bar)',
};

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

export function DashboardView() {
  const me = useCurrentUser();
  const dashboard = useDashboard();
  const data = dashboard.data;

  const header = (
    <PageHeader
      title={`${greeting()}, ${me.name.split(' ')[0]}`}
      description={`Here's what needs attention ${me.role === 'admin' ? 'across the team' : 'in your inquiries'}.`}
    />
  );

  if (!data && dashboard.isError) {
    return (
      <>
        {header}
        <div className="card">
          <StateBlock
            icon={<IconWarningCircle width={22} height={22} />}
            title="Couldn't load the dashboard"
            action={
              <button className="btn" type="button" onClick={() => void dashboard.refetch()}>
                Try again
              </button>
            }
          >
            {errorMessage(dashboard.error)}
          </StateBlock>
        </div>
      </>
    );
  }

  const total = data ? data.counts.new + data.counts.in_progress + data.counts.resolved : 0;

  if (data && total === 0) {
    return (
      <>
        {header}
        <div className="card">
          <StateBlock
            icon={<IconInbox width={22} height={22} />}
            title="No inquiries yet"
            action={
              <Link className="btn btn-primary" href="/inquiries/new">
                + Record the first inquiry
              </Link>
            }
          >
            When a customer reaches out by phone, email or chat, record it here so it can be tracked to resolution.
          </StateBlock>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="kpis">
        <Kpi label="New" value={data?.counts.new} sub={data ? `${data.unassignedNew} unassigned` : ''} color={STATUS_COLOR.new} href="/inquiries?status=new" />
        <Kpi label="In Progress" value={data?.counts.in_progress} sub="Being handled" color={STATUS_COLOR.in_progress} href="/inquiries?status=in_progress" />
        <Kpi label="Resolved" value={data?.counts.resolved} sub="Closed out" color={STATUS_COLOR.resolved} href="/inquiries?status=resolved" />
        <Kpi label="Assigned to me" value={data?.myOpen.total} sub="Open in my queue" color="var(--text-2)" href="/inquiries?assignee=me" />
      </div>
      <div className="grid-2">
        <MyQueue data={data} />
        <div className="stack">
          <StatusBreakdown data={data} total={total} />
          <RecentlyUpdated data={data} />
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value, sub, color, href }: { label: string; value?: number; sub: string; color: string; href: string }) {
  return (
    <Link className="card kpi" href={href}>
      <div className="kpi-label">
        <span className="kpi-dot" style={{ background: color }} />
        {label}
      </div>
      <div className="kpi-value">{value ?? <Skeleton width={48} height={26} />}</div>
      <div className="kpi-sub">{sub}</div>
    </Link>
  );
}

function MyQueue({ data }: { data?: DashboardResponse }) {
  const router = useRouter();
  return (
    <section className="card" aria-labelledby="queue-heading">
      <div className="card-head">
        <h3 id="queue-heading">My open queue</h3>
        <Link href="/inquiries?assignee=me" className="btn btn-ghost btn-sm">
          View all
        </Link>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Ref</th>
              <th scope="col">Subject / customer</th>
              <th scope="col">Status</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {!data && <SkeletonRows rows={3} columns={4} />}
            {data?.myOpen.items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-row">
                  Nothing in your queue.
                </td>
              </tr>
            )}
            {data?.myOpen.items.map((inquiry) => (
              <tr key={inquiry.id} className="clickable" onClick={() => router.push(`/inquiries/${inquiry.id}`)}>
                <td className="mono">
                  <Link href={`/inquiries/${inquiry.id}`} onClick={(event) => event.stopPropagation()}>
                    {inquiry.reference}
                  </Link>
                </td>
                <td className="subject">
                  {inquiry.subject}
                  <span className="sub">{inquiry.customerName}</span>
                </td>
                <td>
                  <StatusBadge status={inquiry.status} />
                </td>
                <td className="muted">{timeAgo(inquiry.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-foot">
        <span>Waiting longest first</span>
      </div>
    </section>
  );
}

function StatusBreakdown({ data, total }: { data?: DashboardResponse; total: number }) {
  return (
    <section className="card" aria-labelledby="breakdown-heading">
      <div className="card-head">
        <h3 id="breakdown-heading">Status breakdown</h3>
        <span className="faint">{data ? `${total} total` : ''}</span>
      </div>
      <div className="card-body">
        {data ? (
          <div className="dist" aria-hidden="true">
            {INQUIRY_STATUSES.filter((status) => data.counts[status] > 0).map((status) => (
              <div key={status} style={{ flex: data.counts[status], background: STATUS_COLOR[status] }} />
            ))}
          </div>
        ) : (
          <Skeleton height={10} />
        )}
        <div className="legend">
          {INQUIRY_STATUSES.map((status) => (
            <div key={status} className="legend-row">
              <span className="sw" style={{ background: STATUS_COLOR[status] }} />
              {STATUS_LABEL[status]}
              <span className="v">{data ? data.counts[status] : '–'}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecentlyUpdated({ data }: { data?: DashboardResponse }) {
  return (
    <section className="card" aria-labelledby="recent-heading">
      <div className="card-head">
        <h3 id="recent-heading">Recently updated</h3>
      </div>
      <ul className="list-plain">
        {!data && (
          <>
            <li>
              <Skeleton />
            </li>
            <li>
              <Skeleton width="80%" />
            </li>
          </>
        )}
        {data?.recent.map((inquiry) => (
          <li key={inquiry.id}>
            <div className="t">
              <Link href={`/inquiries/${inquiry.id}`}>{inquiry.subject}</Link>
              <small>
                {inquiry.reference} · {timeAgo(inquiry.updatedAt)}
              </small>
            </div>
            <StatusBadge status={inquiry.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
