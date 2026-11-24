import type { StaffListResponse } from '@inquirydesk/shared';
import type { Request, Response } from 'express';
import { toStaffMember } from '../../domain/user';
import type { UserRepository } from '../../repositories/user-repository';

/** Staff directory for the "Assign to" pickers. Read-only, no business rules, so it reads the repository directly. */
export class StaffController {
  constructor(private readonly users: UserRepository) {}

  /** GET /api/users */
  list = async (_req: Request, res: Response): Promise<void> => {
    const users = await this.users.listStaff();
    res.json({ users: users.map(toStaffMember) } satisfies StaffListResponse);
  };
}
