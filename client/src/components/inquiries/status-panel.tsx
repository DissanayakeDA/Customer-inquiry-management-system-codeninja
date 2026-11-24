'use client';

import { INQUIRY_STATUSES, STATUS_LABEL, STATUS_TRANSITIONS, type InquiryDto, type InquiryStatus } from '@inquirydesk/shared';
import { Fragment } from 'react';
import { Spinner, StatusBadge } from '../ui/primitives';

const STATUS_HELP: Readonly<Record<InquiryStatus, string>> = {
  new: 'Start working to take ownership. An inquiry must be in progress before it can be resolved.',
  in_progress: 'Mark it resolved once the customer has been answered.',
  resolved: 'Reopen it if the customer follows up on the same issue.',
};

const position = (status: InquiryStatus) => INQUIRY_STATUSES.indexOf(status);

interface StatusPanelProps {
  inquiry: InquiryDto;
  /** Status currently being saved, to show a spinner on that button. */
  pendingStatus: InquiryStatus | null;
  disabled: boolean;
  onChangeStatus: (to: InquiryStatus) => void;
}

/** Shows where the inquiry is in its lifecycle and offers only the transitions the shared rules allow. */
export function StatusPanel({ inquiry, pendingStatus, disabled, onChangeStatus }: StatusPanelProps) {
  const current = position(inquiry.status);

  return (
    <section className="card" aria-labelledby="status-heading">
      <div className="card-head">
        <h3 id="status-heading">Status</h3>
        <span className="faint mono" title="Changes each time this inquiry is updated">
          v{inquiry.version}
        </span>
      </div>
      <div className="card-body">
        <div className="status-current">
          <span className="muted">Current</span>
          <StatusBadge status={inquiry.status} large />
        </div>
        <ol className="flow" aria-label="Lifecycle">
          {INQUIRY_STATUSES.map((status, index) => (
            <Fragment key={status}>
              <li className={`step${index === current ? ' cur' : index < current ? ' done' : ''}`} aria-current={index === current ? 'step' : undefined}>
                {STATUS_LABEL[status]}
              </li>
              {index < INQUIRY_STATUSES.length - 1 && (
                <li className="arrow" aria-hidden="true">
                  ›
                </li>
              )}
            </Fragment>
          ))}
        </ol>
        <div className="actions-stack">
          {STATUS_TRANSITIONS[inquiry.status].map((transition) => (
            <button
              key={transition.to}
              type="button"
              className={`btn btn-block${position(transition.to) > current ? ' btn-primary' : ''}`}
              disabled={disabled}
              onClick={() => onChangeStatus(transition.to)}
            >
              {pendingStatus === transition.to ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                transition.action
              )}
            </button>
          ))}
        </div>
        <p className="help-text">{STATUS_HELP[inquiry.status]}</p>
      </div>
    </section>
  );
}
