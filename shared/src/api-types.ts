import type { InquiryStatus } from './status';

/**
 * JSON shapes exchanged between the API and the web client.
 * Dates are ISO-8601 strings on the wire.
 */

export type UserRole = 'agent' | 'admin';

export interface UserSummary {
  id: number;
  name: string;
}

export interface StaffMember extends UserSummary {
  role: UserRole;
}

export interface SessionUser extends UserSummary {
  email: string;
  role: UserRole;
}

export interface InquiryDto {
  id: number;
  /** Display reference, e.g. "INQ-1012". */
  reference: string;
  customerName: string;
  contact: string;
  subject: string;
  description: string;
  status: InquiryStatus;
  createdBy: UserSummary;
  assignedTo: UserSummary | null;
  updatedBy: UserSummary;
  /** Incremented on every change; sent back on updates for optimistic concurrency control. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type StatusCounts = Record<InquiryStatus, number>;

export interface InquiryListResponse {
  items: InquiryDto[];
  /** Number of inquiries matching all filters (across every page). */
  total: number;
  page: number;
  pageSize: number;
  /** Per-status counts for the current search/assignee filters, ignoring the status filter. */
  counts: StatusCounts & { all: number };
}

export interface DashboardResponse {
  counts: StatusCounts;
  unassignedNew: number;
  myOpen: { total: number; items: InquiryDto[] };
  recent: InquiryDto[];
}

export interface SessionResponse {
  user: SessionUser;
}

export interface StaffListResponse {
  users: StaffMember[];
}

// ---------------------------------------------------------------- errors

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_JSON'
  | 'INVALID_ID'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'NOT_FOUND'
  | 'DUPLICATE_INQUIRY'
  | 'STALE_VERSION'
  | 'INVALID_TRANSITION'
  | 'PAYLOAD_TOO_LARGE'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field name → message, present for VALIDATION_ERROR. */
    fieldErrors?: Record<string, string>;
    details?: Record<string, unknown>;
  };
}

/** `details` of a DUPLICATE_INQUIRY error. */
export interface DuplicateInquiryDetails {
  existing: {
    id: number;
    reference: string;
    status: InquiryStatus;
    /** Whether the requesting user is allowed to open the existing inquiry. */
    accessible: boolean;
  } | null;
}

/** `details` of a STALE_VERSION error: the record as it is now. */
export interface StaleVersionDetails {
  current: InquiryDto;
  expectedVersion: number;
}

/** `details` of an INVALID_TRANSITION error. */
export interface InvalidTransitionDetails {
  from: InquiryStatus;
  to: InquiryStatus;
  allowed: InquiryStatus[];
}
