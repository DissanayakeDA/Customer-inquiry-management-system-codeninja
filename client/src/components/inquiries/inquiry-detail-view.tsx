'use client';

import { STATUS_LABEL, canViewInquiry, type InquiryDto, type InquiryStatus } from '@inquirydesk/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAssignInquiry, useChangeInquiryStatus, useInquiry, useStaff } from '@/hooks/use-inquiries';
import { errorMessage, isApiError } from '@/lib/api';
import { contactHref, formatDateTime, timeAgo } from '@/lib/format';
import { useCurrentUser } from '../session/session-context';
import { Alert } from '../ui/alert';
import { IconLock, IconWarningCircle } from '../ui/icons';
import { PageHeader, Skeleton, StateBlock } from '../ui/primitives';
import { useToast } from '../ui/toast';
import { AssignmentPanel } from './assignment-panel';
import { StatusPanel } from './status-panel';
import { UpdateFailureNotice, type AttemptedChange } from './update-notice';

/** Loads one inquiry by the id in the URL and decides which state to show. */
export function InquiryDetailView({ inquiryId }: { inquiryId: string }) {
  const query = useInquiry(inquiryId);
  const gone = isApiError(query.error, 'NOT_FOUND') || isApiError(query.error, 'INVALID_ID');

  // Keep showing loaded data if only a background refresh failed; switch away if it no longer exists.
  if (query.data && !gone) return <InquiryDetail inquiry={query.data} refreshFailed={query.isError} />;
  if (query.isPending) return <DetailSkeleton />;
  return <DetailUnavailable error={query.error} onRetry={() => void query.refetch()} />;
}

interface Failure {
  error: unknown;
  attempt: AttemptedChange;
}

function InquiryDetail({ inquiry, refreshFailed }: { inquiry: InquiryDto; refreshFailed: boolean }) {
  const me = useCurrentUser();
  const router = useRouter();
  const toast = useToast();
  const staff = useStaff();
  const changeStatus = useChangeInquiryStatus();
  const assign = useAssignInquiry();

  const [failure, setFailure] = useState<Failure | null>(null);
  // Last version this screen knowingly showed. A higher version arriving from a background refetch
  // (e.g. on returning to this tab) means someone else changed it, which is worth pointing out.
  const [acknowledgedVersion, setAcknowledgedVersion] = useState(inquiry.version);
  const busy = changeStatus.isPending || assign.isPending;

  function onFailure(error: unknown, attempt: AttemptedChange) {
    setFailure({ error, attempt });
    // The 409 response carries the current record, which is now on screen and explained by the notice.
    if (isApiError(error, 'STALE_VERSION')) {
      setAcknowledgedVersion((error.details as { current: InquiryDto }).current.version);
    }
  }

  function handleStatusChange(to: InquiryStatus) {
    setFailure(null);
    changeStatus.mutate(
      { inquiry, to },
      {
        onSuccess: (updated) => {
          setAcknowledgedVersion(updated.version);
          toast(`${updated.reference} → ${STATUS_LABEL[updated.status]}`);
        },
        onError: (error) => onFailure(error, { kind: 'status', to }),
      },
    );
  }

  function handleAssign(assigneeId: number | null) {
    setFailure(null);
    const assigneeName = assigneeId === null ? null : (staff.data?.find((member) => member.id === assigneeId)?.name ?? 'the selected person');
    assign.mutate(
      { inquiry, assigneeId },
      {
        onSuccess: (updated) => {
          setAcknowledgedVersion(updated.version);
          if (!canViewInquiry(me, updated)) {
            // Handed over to a colleague: this agent no longer has access, so leave the page.
            toast(`${updated.reference} handed over to ${updated.assignedTo?.name ?? 'nobody'}. It is no longer in your list.`);
            router.push('/inquiries');
            return;
          }
          toast(updated.assignedTo ? `Assigned to ${updated.assignedTo.name}` : 'Inquiry unassigned');
        },
        onError: (error) => onFailure(error, { kind: 'assignee', assigneeName }),
      },
    );
  }

  const changedElsewhere = !failure && inquiry.version > acknowledgedVersion;

  return (
    <>
      <PageHeader
        eyebrow={<span className="mono">{inquiry.reference}</span>}
        title={inquiry.subject}
        description={`Opened ${timeAgo(inquiry.createdAt)} by ${inquiry.createdBy.name}`}
        action={
          <Link className="btn" href="/inquiries">
            ← Back to list
          </Link>
        }
      />

      <div className="notices">
        {failure && <UpdateFailureNotice error={failure.error} attempt={failure.attempt} onDismiss={() => setFailure(null)} />}
        {changedElsewhere && (
          <Alert
            tone="info"
            title={`Updated by ${inquiry.updatedBy.name} ${timeAgo(inquiry.updatedAt)}.`}
            actions={
              <button className="btn btn-sm" type="button" onClick={() => setAcknowledgedVersion(inquiry.version)}>
                Got it
              </button>
            }
          >
            This inquiry changed while you had it open. You are now seeing the latest version.
          </Alert>
        )}
        {refreshFailed && (
          <Alert tone="warn" title="Couldn't refresh this inquiry.">
            Showing the last version we loaded, which may be out of date. We&apos;ll retry when you return to this tab.
          </Alert>
        )}
      </div>

      <div className="detail-layout">
        <div className="stack">
          <section className="card" aria-labelledby="customer-heading">
            <div className="card-head">
              <h3 id="customer-heading">Customer</h3>
            </div>
            <div className="card-body">
              <dl className="dl">
                <dt>Name</dt>
                <dd>{inquiry.customerName}</dd>
                <dt>Contact</dt>
                <dd>
                  <a href={contactHref(inquiry.contact)}>{inquiry.contact}</a>
                </dd>
              </dl>
            </div>
          </section>
          <section className="card" aria-labelledby="description-heading">
            <div className="card-head">
              <h3 id="description-heading">Description</h3>
            </div>
            <div className="card-body">
              <p className="desc">{inquiry.description}</p>
            </div>
          </section>
        </div>

        <div className="stack">
          <StatusPanel
            inquiry={inquiry}
            disabled={busy}
            pendingStatus={changeStatus.isPending ? (changeStatus.variables?.to ?? null) : null}
            onChangeStatus={handleStatusChange}
          />
          <AssignmentPanel inquiry={inquiry} staff={staff.data ?? []} me={me} disabled={busy} onAssign={handleAssign} />
          <div className="card card-body meta">
            <div>
              <span>Created</span>
              <b>{formatDateTime(inquiry.createdAt)}</b>
            </div>
            <div>
              <span>Created by</span>
              <b>{inquiry.createdBy.name}</b>
            </div>
            <div>
              <span>Last updated</span>
              <b title={formatDateTime(inquiry.updatedAt)}>
                {timeAgo(inquiry.updatedAt)} by {inquiry.updatedBy.name}
              </b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading inquiry">
      <div className="page-head">
        <div style={{ width: '100%' }}>
          <Skeleton width={80} />
          <Skeleton width="45%" height={22} style={{ marginTop: 10 }} />
        </div>
      </div>
      <div className="detail-layout">
        <div className="card card-body stack">
          <Skeleton width="60%" />
          <Skeleton width="40%" />
          <Skeleton width="90%" />
        </div>
        <div className="card card-body stack">
          <Skeleton width="50%" />
          <Skeleton height={34} />
        </div>
      </div>
    </div>
  );
}

function DetailUnavailable({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const back = (
    <Link className="btn" href="/inquiries">
      Back to inquiries
    </Link>
  );

  let content;
  if (isApiError(error, 'INVALID_ID')) {
    content = (
      <StateBlock icon={<IconLock width={22} height={22} />} title="Invalid inquiry link" action={back}>
        {error.message} Check the link and try again.
      </StateBlock>
    );
  } else if (isApiError(error, 'NOT_FOUND')) {
    content = (
      <StateBlock icon={<IconLock width={22} height={22} />} title="Inquiry not found" action={back}>
        This inquiry doesn&apos;t exist or you don&apos;t have access to it. If you think this is a mistake, ask an administrator.
      </StateBlock>
    );
  } else {
    content = (
      <StateBlock
        icon={<IconWarningCircle width={22} height={22} />}
        title="Couldn't load this inquiry"
        action={
          <button className="btn" type="button" onClick={onRetry}>
            Try again
          </button>
        }
      >
        {errorMessage(error)}
      </StateBlock>
    );
  }

  return <div className="card narrow-card">{content}</div>;
}
