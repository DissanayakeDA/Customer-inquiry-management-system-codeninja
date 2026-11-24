import type { SessionUser, StaffMember, UserRole } from '@inquirydesk/shared';

export interface User {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
}

/** A user record including the password hash. Never leaves the auth flow. */
export interface UserCredentials extends User {
  readonly passwordHash: string;
}

export function toSessionUser(user: User): SessionUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function toStaffMember(user: User): StaffMember {
  return { id: user.id, name: user.name, role: user.role };
}
