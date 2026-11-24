import type { InquiryStatus } from '@inquirydesk/shared';
import { describe, expect, it } from 'vitest';
import { InvalidTransitionError } from '../../src/domain/errors';
import type { Inquiry } from '../../src/domain/inquiry';
import { StatusTransitionPolicy } from '../../src/domain/status-transition-policy';
import type { User } from '../../src/domain/user';

const policy = new StatusTransitionPolicy();

const agent: User = { id: 7, name: 'Kasun Silva', email: 'kasun@inquirydesk.test', role: 'agent' };

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 1001,
    customerName: 'Dilani',
    contact: 'dilani@example.com',
    subject: 'Delivery delayed',
    description: 'Order has not arrived yet.',
    status: 'new',
    createdBy: { id: 2, name: 'Ayesha Fernando' },
    assignedTo: null,
    updatedBy: { id: 2, name: 'Ayesha Fernando' },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('StatusTransitionPolicy', () => {
  it.each<[InquiryStatus, InquiryStatus]>([
    ['new', 'in_progress'],
    ['in_progress', 'resolved'],
    ['resolved', 'in_progress'], // reopen
  ])('allows %s → %s', (from, to) => {
    expect(() => policy.assertCanTransition(from, to)).not.toThrow();
  });

  it.each<[InquiryStatus, InquiryStatus]>([
    ['new', 'resolved'], // must be picked up before it can be resolved
    ['in_progress', 'new'],
    ['resolved', 'new'],
    ['new', 'new'], // no-op changes are rejected too, so a stale double-click is visible
    ['resolved', 'resolved'],
  ])('rejects %s → %s with InvalidTransitionError', (from, to) => {
    expect(() => policy.assertCanTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it('explains which transitions are allowed in the error details', () => {
    try {
      policy.assertCanTransition('new', 'resolved');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).details).toEqual({ from: 'new', to: 'resolved', allowed: ['in_progress'] });
    }
  });

  it('makes whoever starts work on an unassigned inquiry its assignee', () => {
    expect(policy.assigneeAfterTransition(inquiry({ assignedTo: null }), 'in_progress', agent)).toBe(agent.id);
  });

  it('keeps the existing assignee when the inquiry is already owned', () => {
    const owned = inquiry({ assignedTo: { id: 2, name: 'Ayesha Fernando' } });
    expect(policy.assigneeAfterTransition(owned, 'in_progress', agent)).toBeUndefined();
  });
});
