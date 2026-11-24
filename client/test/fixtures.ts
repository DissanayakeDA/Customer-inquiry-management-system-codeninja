import type { InquiryDto, SessionUser, StaffMember } from '@inquirydesk/shared';

export const ayesha: SessionUser = { id: 2, name: 'Ayesha Fernando', email: 'ayesha@inquirydesk.test', role: 'agent' };

export const staff: StaffMember[] = [
  { id: 1, name: 'Nimal Perera', role: 'admin' },
  { id: 2, name: 'Ayesha Fernando', role: 'agent' },
  { id: 3, name: 'Kasun Silva', role: 'agent' },
];

export function inquiryDto(overrides: Partial<InquiryDto> = {}): InquiryDto {
  const now = new Date().toISOString();
  return {
    id: 1012,
    reference: 'INQ-1012',
    customerName: 'Dilani Jayasuriya',
    contact: 'dilani@example.com',
    subject: 'Delivery delayed for order #5521',
    description: 'Ordered on Monday, promised within 2 days, still not received.',
    status: 'new',
    createdBy: { id: 2, name: 'Ayesha Fernando' },
    assignedTo: null,
    updatedBy: { id: 2, name: 'Ayesha Fernando' },
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** JSON Response like the API (through the Next.js proxy) would send. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
