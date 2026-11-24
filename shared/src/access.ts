import type { UserRole } from './api-types';

/**
 * Access rule for inquiries:
 *   - admins can see and act on every inquiry;
 *   - agents can see and act on inquiries they created or that are assigned to them.
 *
 * The API enforces this (RoleBasedInquiryAccessPolicy + SQL scoping). The client only uses it
 * to react sensibly, e.g. leaving a page after handing an inquiry over to a colleague.
 */
export interface InquiryViewer {
  id: number;
  role: UserRole;
}

export interface InquiryOwnership {
  createdBy: { id: number };
  assignedTo: { id: number } | null;
}

export function canViewInquiry(viewer: InquiryViewer, inquiry: InquiryOwnership): boolean {
  if (viewer.role === 'admin') return true;
  return inquiry.createdBy.id === viewer.id || inquiry.assignedTo?.id === viewer.id;
}
