import { OPEN_STATUSES, type StatusCounts } from '@inquirydesk/shared';
import type { InquiryAccessPolicy } from '../domain/access-policy';
import type { Inquiry } from '../domain/inquiry';
import type { User } from '../domain/user';
import type { InquiryRepository } from '../repositories/inquiry-repository';

export interface DashboardSummary {
  counts: StatusCounts;
  unassignedNew: number;
  myOpen: { total: number; items: Inquiry[] };
  recent: Inquiry[];
}

const MY_QUEUE_SIZE = 10;
const RECENT_SIZE = 5;

/** Read-only overview built from the same scoped repository queries as the inquiry list. */
export class DashboardService {
  constructor(
    private readonly inquiries: InquiryRepository,
    private readonly access: InquiryAccessPolicy,
  ) {}

  async getSummary(actor: User): Promise<DashboardSummary> {
    const scope = this.access.scopeFor(actor);

    const [counts, unassignedCounts, myOpen, recent] = await Promise.all([
      this.inquiries.countByStatus({ scope }),
      this.inquiries.countByStatus({ scope, assignee: { kind: 'none' } }),
      // "My queue": open work assigned to me, waiting longest first.
      this.inquiries.findPage({
        scope,
        assignee: { kind: 'user', userId: actor.id },
        statuses: OPEN_STATUSES,
        order: 'oldest_activity',
        limit: MY_QUEUE_SIZE,
        offset: 0,
      }),
      this.inquiries.findPage({ scope, order: 'recent_activity', limit: RECENT_SIZE, offset: 0 }),
    ]);

    return {
      counts,
      unassignedNew: unassignedCounts.new,
      myOpen: { total: myOpen.total, items: myOpen.items },
      recent: recent.items,
    };
  }
}
