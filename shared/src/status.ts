/**
 * Inquiry lifecycle — the single source of truth for which status changes are allowed.
 * The API enforces it (StatusTransitionPolicy) and the UI uses it to decide which actions to offer.
 *
 *   New ──▶ In Progress ──▶ Resolved
 *                ▲              │
 *                └── reopen ────┘
 *
 * New → Resolved is deliberately not allowed: someone must pick an inquiry up (and so own it)
 * before it can be closed. In Progress → New is not allowed either; there is no "un-start".
 */
export const INQUIRY_STATUSES = ['new', 'in_progress', 'resolved'] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

/** Statuses that still need work. */
export const OPEN_STATUSES: readonly InquiryStatus[] = ['new', 'in_progress'];

export const STATUS_LABEL: Readonly<Record<InquiryStatus, string>> = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};

export interface StatusTransition {
  readonly to: InquiryStatus;
  /** Verb shown on the button that performs this transition. */
  readonly action: string;
}

export const STATUS_TRANSITIONS: Readonly<Record<InquiryStatus, readonly StatusTransition[]>> = {
  new: [{ to: 'in_progress', action: 'Start working' }],
  in_progress: [{ to: 'resolved', action: 'Mark resolved' }],
  resolved: [{ to: 'in_progress', action: 'Reopen' }],
};

export function isInquiryStatus(value: unknown): value is InquiryStatus {
  return typeof value === 'string' && (INQUIRY_STATUSES as readonly string[]).includes(value);
}

export function allowedNextStatuses(from: InquiryStatus): InquiryStatus[] {
  return STATUS_TRANSITIONS[from].map((transition) => transition.to);
}

export function isTransitionAllowed(from: InquiryStatus, to: InquiryStatus): boolean {
  return allowedNextStatuses(from).includes(to);
}
