import { describe, expect, it } from 'vitest';
import { RoleBasedInquiryAccessPolicy, type InquiryScope } from '../../src/domain/access-policy';
import type { Inquiry } from '../../src/domain/inquiry';
import type { User } from '../../src/domain/user';

const policy = new RoleBasedInquiryAccessPolicy();

const admin: User = { id: 1, name: 'Nimal Perera', email: 'nimal@inquirydesk.test', role: 'admin' };
const ayesha: User = { id: 2, name: 'Ayesha Fernando', email: 'ayesha@inquirydesk.test', role: 'agent' };
const kasun: User = { id: 3, name: 'Kasun Silva', email: 'kasun@inquirydesk.test', role: 'agent' };

function inquiry(createdBy: User, assignedTo: User | null): Inquiry {
  return {
    id: 1001,
    customerName: 'Dilani',
    contact: 'dilani@example.com',
    subject: 'Delivery delayed',
    description: 'Order has not arrived yet.',
    status: 'new',
    createdBy: { id: createdBy.id, name: createdBy.name },
    assignedTo: assignedTo && { id: assignedTo.id, name: assignedTo.name },
    updatedBy: { id: createdBy.id, name: createdBy.name },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Reference implementation of how a repository applies a scope. */
function matchesScope(scope: InquiryScope, item: Inquiry): boolean {
  return scope.kind === 'all' || item.createdBy.id === scope.userId || item.assignedTo?.id === scope.userId;
}

describe('RoleBasedInquiryAccessPolicy', () => {
  it('lets an agent see inquiries they created or are assigned to', () => {
    expect(policy.canView(ayesha, inquiry(ayesha, null))).toBe(true);
    expect(policy.canView(ayesha, inquiry(kasun, ayesha))).toBe(true);
  });

  it("hides another agent's inquiry from an agent", () => {
    expect(policy.canView(ayesha, inquiry(kasun, kasun))).toBe(false);
    expect(policy.canView(ayesha, inquiry(kasun, null))).toBe(false);
  });

  it('lets an admin see every inquiry', () => {
    expect(policy.canView(admin, inquiry(kasun, null))).toBe(true);
    expect(policy.scopeFor(admin)).toEqual({ kind: 'all' });
  });

  it('list scoping and single-record checks always agree', () => {
    const people = [admin, ayesha, kasun];
    const inquiries = people.flatMap((creator) => [null, ...people].map((assignee) => inquiry(creator, assignee)));

    for (const viewer of people) {
      for (const item of inquiries) {
        expect(matchesScope(policy.scopeFor(viewer), item)).toBe(policy.canView(viewer, item));
      }
    }
  });
});
