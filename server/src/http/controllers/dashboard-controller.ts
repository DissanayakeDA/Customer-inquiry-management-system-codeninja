import type { DashboardResponse } from '@inquirydesk/shared';
import type { Request, Response } from 'express';
import { toInquiryDto } from '../../domain/inquiry';
import type { DashboardService } from '../../services/dashboard-service';
import { requireUser } from '../request-context';

export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** GET /api/dashboard */
  get = async (req: Request, res: Response): Promise<void> => {
    const summary = await this.dashboard.getSummary(requireUser(req));
    res.json({
      counts: summary.counts,
      unassignedNew: summary.unassignedNew,
      myOpen: { total: summary.myOpen.total, items: summary.myOpen.items.map(toInquiryDto) },
      recent: summary.recent.map(toInquiryDto),
    } satisfies DashboardResponse);
  };
}
