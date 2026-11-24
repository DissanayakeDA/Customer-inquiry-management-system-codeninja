import { canViewInquiry } from '@inquirydesk/shared';
import type { Inquiry } from './inquiry';
import type { User } from './user';

/**
 * Which inquiries a user may see, expressed in a storage-neutral way.
 * Repositories translate a scope into a WHERE clause; they know nothing about roles.
 */
export type InquiryScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'involving'; readonly userId: number };

/**
 * Decides who can access which inquiries. The service depends on this interface, so the rule
 * can change (e.g. team-based access) without touching the service or the repositories.
 */
export interface InquiryAccessPolicy {
  /** Restriction applied to every list/count query for this user. */
  scopeFor(user: User): InquiryScope;
  /** Check applied to every single-record read and write. */
  canView(user: User, inquiry: Inquiry): boolean;
}

/**
 * Admins see everything; agents see inquiries they created or are assigned to.
 * The rule itself lives in `canViewInquiry` (shared) so the client reacts consistently.
 */
export class RoleBasedInquiryAccessPolicy implements InquiryAccessPolicy {
  scopeFor(user: User): InquiryScope {
    return user.role === 'admin' ? { kind: 'all' } : { kind: 'involving', userId: user.id };
  }

  canView(user: User, inquiry: Inquiry): boolean {
    return canViewInquiry(user, inquiry);
  }
}
