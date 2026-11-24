import type { InquiryStatus, StatusCounts } from '@inquirydesk/shared';
import type { InquiryScope } from '../domain/access-policy';
import type { Inquiry, InquiryChanges, NewInquiry } from '../domain/inquiry';

export type AssigneeCriterion = { readonly kind: 'user'; readonly userId: number } | { readonly kind: 'none' };

/** Filters shared by list and count queries. `scope` is mandatory, so no query can forget access control. */
export interface InquiryCriteria {
  readonly scope: InquiryScope;
  readonly statuses?: readonly InquiryStatus[];
  /** Free text matched against customer name, contact, subject and reference (INQ-1012 / 1012). */
  readonly search?: string;
  readonly assignee?: AssigneeCriterion;
}

export interface InquiryPageRequest extends InquiryCriteria {
  /** Most recently updated first, or least recently updated (i.e. waiting longest) first. */
  readonly order: 'recent_activity' | 'oldest_activity';
  readonly limit: number;
  readonly offset: number;
}

export interface InquiryPage {
  readonly items: Inquiry[];
  readonly total: number;
}

export type CreateInquiryResult =
  | { readonly kind: 'created'; readonly inquiry: Inquiry }
  /** An open inquiry with the same contact + subject exists (null if it closed in the meantime). */
  | { readonly kind: 'duplicate'; readonly existing: Inquiry | null };

export type UpdateInquiryResult =
  | { readonly kind: 'updated'; readonly inquiry: Inquiry }
  /** The row's version no longer matches `expectedVersion` (someone else changed it first). */
  | { readonly kind: 'stale' }
  /** Reopening would create a second open inquiry for the same contact + subject. */
  | { readonly kind: 'duplicate'; readonly existing: Inquiry | null };

/**
 * Persistence port for inquiries. Reports facts (created / stale / duplicate) as values and
 * leaves the business decision about what they mean to InquiryService.
 */
export interface InquiryRepository {
  findById(id: number): Promise<Inquiry | null>;
  findPage(request: InquiryPageRequest): Promise<InquiryPage>;
  countByStatus(criteria: InquiryCriteria): Promise<StatusCounts>;
  create(data: NewInquiry): Promise<CreateInquiryResult>;
  /** Applies `changes` only if the stored version still equals `expectedVersion`, then bumps the version. */
  update(id: number, expectedVersion: number, changes: InquiryChanges): Promise<UpdateInquiryResult>;
}
