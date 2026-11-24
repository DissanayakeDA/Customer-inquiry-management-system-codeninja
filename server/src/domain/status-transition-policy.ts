import { STATUS_TRANSITIONS, type InquiryStatus, type StatusTransition } from '@inquirydesk/shared';
import { InvalidTransitionError } from './errors';
import type { Inquiry } from './inquiry';
import type { User } from './user';

type TransitionTable = Readonly<Record<InquiryStatus, readonly StatusTransition[]>>;

/** Enforces the inquiry lifecycle defined in the shared STATUS_TRANSITIONS table. */
export class StatusTransitionPolicy {
  constructor(private readonly transitions: TransitionTable = STATUS_TRANSITIONS) {}

  allowedFrom(status: InquiryStatus): InquiryStatus[] {
    return this.transitions[status].map((transition) => transition.to);
  }

  /** @throws InvalidTransitionError when `from → to` is not in the lifecycle (including no-op changes). */
  assertCanTransition(from: InquiryStatus, to: InquiryStatus): void {
    const allowed = this.allowedFrom(from);
    if (!allowed.includes(to)) throw new InvalidTransitionError(from, to, allowed);
  }

  /**
   * Side effect of a transition on ownership: picking up an unassigned inquiry
   * (moving it to In Progress) makes the person who picked it up its assignee, so an
   * inquiry being worked on always has an owner.
   *
   * @returns the new assignee id, or `undefined` to leave the assignment unchanged.
   */
  assigneeAfterTransition(inquiry: Inquiry, to: InquiryStatus, actor: User): number | undefined {
    return to === 'in_progress' && inquiry.assignedTo === null ? actor.id : undefined;
  }
}
