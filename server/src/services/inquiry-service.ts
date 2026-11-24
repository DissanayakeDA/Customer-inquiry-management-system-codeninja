import {
  formatReference,
  type AssignInquiryInput,
  type ChangeStatusInput,
  type CreateInquiryData,
  type ListInquiriesQuery,
  type StatusCounts,
} from '@inquirydesk/shared';
import type { InquiryAccessPolicy } from '../domain/access-policy';
import {
  DuplicateInquiryError,
  InquiryNotFoundError,
  StaleVersionError,
  ValidationError,
} from '../domain/errors';
import type { Inquiry, InquiryChanges } from '../domain/inquiry';
import type { StatusTransitionPolicy } from '../domain/status-transition-policy';
import type { User } from '../domain/user';
import type { AssigneeCriterion, InquiryCriteria, InquiryRepository } from '../repositories/inquiry-repository';
import type { UserRepository } from '../repositories/user-repository';

export interface InquiryListResult {
  items: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
  counts: StatusCounts & { all: number };
}

/**
 * Inquiry use cases. Every method receives the acting user and applies, in order:
 * access rule → optimistic-concurrency check → business rule → persistence.
 */
export class InquiryService {
  constructor(
    private readonly inquiries: InquiryRepository,
    private readonly users: UserRepository,
    private readonly access: InquiryAccessPolicy,
    private readonly lifecycle: StatusTransitionPolicy,
  ) {}

  async list(actor: User, query: ListInquiriesQuery): Promise<InquiryListResult> {
    const criteria: InquiryCriteria = {
      scope: this.access.scopeFor(actor),
      search: query.q,
      assignee: this.toAssigneeCriterion(actor, query.assignee),
    };

    const [page, counts] = await Promise.all([
      this.inquiries.findPage({
        ...criteria,
        statuses: query.status ? [query.status] : undefined,
        order: 'recent_activity',
        limit: query.pageSize,
        offset: (query.page - 1) * query.pageSize,
      }),
      // Counts ignore the status filter so the UI can show "New (3) · In Progress (2) ..." tabs.
      this.inquiries.countByStatus(criteria),
    ]);

    return {
      items: page.items,
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
      counts: { ...counts, all: counts.new + counts.in_progress + counts.resolved },
    };
  }

  getById(actor: User, id: number): Promise<Inquiry> {
    return this.findAccessible(actor, id);
  }

  async create(actor: User, data: CreateInquiryData): Promise<Inquiry> {
    const assignedToId = data.assignedToId ?? null;
    if (assignedToId !== null) await this.assertStaffExists(assignedToId);

    const result = await this.inquiries.create({
      customerName: data.customerName,
      contact: data.contact,
      subject: data.subject,
      description: data.description,
      assignedToId,
      createdById: actor.id,
    });

    if (result.kind === 'duplicate') throw this.duplicateError(actor, result.existing);
    return result.inquiry;
  }

  async changeStatus(actor: User, id: number, input: ChangeStatusInput): Promise<Inquiry> {
    const current = await this.findAccessible(actor, id);
    // Version check before the transition check: a stale screen must never trigger a transition
    // that only looks valid because the user is seeing an old status (e.g. accidentally reopening).
    this.assertCurrentVersion(current, input.version);
    this.lifecycle.assertCanTransition(current.status, input.status);

    return this.applyChanges(actor, current, input.version, {
      status: input.status,
      assignedToId: this.lifecycle.assigneeAfterTransition(current, input.status, actor),
      updatedById: actor.id,
    });
  }

  async assign(actor: User, id: number, input: AssignInquiryInput): Promise<Inquiry> {
    const current = await this.findAccessible(actor, id);
    this.assertCurrentVersion(current, input.version);
    if ((current.assignedTo?.id ?? null) === input.assigneeId) return current; // nothing to change
    if (input.assigneeId !== null) await this.assertStaffExists(input.assigneeId);

    return this.applyChanges(actor, current, input.version, {
      assignedToId: input.assigneeId,
      updatedById: actor.id,
    });
  }

  // ---------------------------------------------------------------- helpers

  /** Missing and not-allowed are deliberately indistinguishable (both 404). */
  private async findAccessible(actor: User, id: number): Promise<Inquiry> {
    const inquiry = await this.inquiries.findById(id);
    if (!inquiry || !this.access.canView(actor, inquiry)) throw new InquiryNotFoundError();
    return inquiry;
  }

  private assertCurrentVersion(current: Inquiry, expectedVersion: number): void {
    if (current.version !== expectedVersion) throw new StaleVersionError(current, expectedVersion);
  }

  private async applyChanges(actor: User, current: Inquiry, version: number, changes: InquiryChanges): Promise<Inquiry> {
    const result = await this.inquiries.update(current.id, version, changes);
    switch (result.kind) {
      case 'updated':
        return result.inquiry;
      case 'stale': {
        // Someone else saved between our read and our write. Report what it looks like now.
        const latest = await this.findAccessible(actor, current.id);
        throw new StaleVersionError(latest, version);
      }
      case 'duplicate':
        throw this.duplicateError(actor, result.existing);
    }
  }

  private async assertStaffExists(userId: number): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new ValidationError({ assignedToId: 'The selected staff member does not exist.' });
  }

  private toAssigneeCriterion(actor: User, filter: ListInquiriesQuery['assignee']): AssigneeCriterion | undefined {
    if (filter === 'me') return { kind: 'user', userId: actor.id };
    if (filter === 'none') return { kind: 'none' };
    return undefined;
  }

  private duplicateError(actor: User, existing: Inquiry | null): DuplicateInquiryError {
    return new DuplicateInquiryError(
      existing && {
        id: existing.id,
        reference: formatReference(existing.id),
        status: existing.status,
        accessible: this.access.canView(actor, existing),
      },
    );
  }
}
