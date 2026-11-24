import { formatReference, type InquiryDto, type InquiryStatus, type UserSummary } from '@inquirydesk/shared';

export interface Inquiry {
  readonly id: number;
  readonly customerName: string;
  readonly contact: string;
  readonly subject: string;
  readonly description: string;
  readonly status: InquiryStatus;
  readonly createdBy: UserSummary;
  readonly assignedTo: UserSummary | null;
  readonly updatedBy: UserSummary;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Data needed to record a new inquiry. Status always starts as "new". */
export interface NewInquiry {
  readonly customerName: string;
  readonly contact: string;
  readonly subject: string;
  readonly description: string;
  readonly assignedToId: number | null;
  readonly createdById: number;
}

/** A change to an existing inquiry. Omitted fields are left as they are. */
export interface InquiryChanges {
  readonly status?: InquiryStatus;
  readonly assignedToId?: number | null;
  readonly updatedById: number;
}

/** Domain object → API representation. */
export function toInquiryDto(inquiry: Inquiry): InquiryDto {
  return {
    id: inquiry.id,
    reference: formatReference(inquiry.id),
    customerName: inquiry.customerName,
    contact: inquiry.contact,
    subject: inquiry.subject,
    description: inquiry.description,
    status: inquiry.status,
    createdBy: inquiry.createdBy,
    assignedTo: inquiry.assignedTo,
    updatedBy: inquiry.updatedBy,
    version: inquiry.version,
    createdAt: inquiry.createdAt.toISOString(),
    updatedAt: inquiry.updatedAt.toISOString(),
  };
}
