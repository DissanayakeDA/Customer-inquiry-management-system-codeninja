import {
  STATUS_LABEL,
  type DuplicateInquiryDetails,
  type InquiryStatus,
  type StaleVersionDetails,
} from '@inquirydesk/shared';
import type { ReactNode } from 'react';
import { isApiError } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { Alert } from '../ui/alert';
import { DuplicateNotice } from './duplicate-notice';

/** What the user tried to do, so the message can say which change was not saved. */
export type AttemptedChange =
  | { kind: 'status'; to: InquiryStatus }
  | { kind: 'assignee'; assigneeName: string | null };

function describeAttempt(attempt: AttemptedChange): string {
  if (attempt.kind === 'status') return `moving it to ${STATUS_LABEL[attempt.to]}`;
  return attempt.assigneeName ? `assigning it to ${attempt.assigneeName}` : 'unassigning it';
}

/** Turns a failed status/assignment update into a message that says what happened and what to do next. */
export function UpdateFailureNotice({ error, attempt, onDismiss }: { error: unknown; attempt: AttemptedChange; onDismiss: () => void }) {
  const dismiss = (
    <button className="btn btn-sm" type="button" onClick={onDismiss}>
      Dismiss
    </button>
  );

  if (isApiError(error, 'STALE_VERSION')) {
    const { current } = error.details as unknown as StaleVersionDetails;
    return (
      <Alert tone="warn" title="This inquiry was changed by someone else." actions={dismiss}>
        {current.updatedBy.name} updated it {timeAgo(current.updatedAt)}, after you opened this page. It is now{' '}
        <b>{STATUS_LABEL[current.status]}</b>
        {current.assignedTo ? ` and assigned to ${current.assignedTo.name}` : ' and unassigned'}. Your change ({describeAttempt(attempt)})
        was not saved. The page now shows the latest version. Try again if it is still needed.
      </Alert>
    );
  }

  if (isApiError(error, 'DUPLICATE_INQUIRY')) {
    return <DuplicateNotice title="This inquiry can't be reopened." details={error.details as unknown as DuplicateInquiryDetails} />;
  }

  let title: ReactNode = "Couldn't save your change.";
  let body: ReactNode = isApiError(error) ? `${error.message} Nothing was changed. Please try again.` : 'Nothing was changed. Please try again.';

  if (isApiError(error, 'INVALID_TRANSITION')) {
    title = "That status change isn't allowed.";
    body = error.message;
  } else if (isApiError(error, 'VALIDATION_ERROR')) {
    body = Object.values(error.fieldErrors)[0] ?? error.message;
  }

  return (
    <Alert tone="error" title={title} actions={dismiss}>
      {body}
    </Alert>
  );
}
