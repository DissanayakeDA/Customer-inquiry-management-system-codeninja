import { createInquirySchema, isValidContact, toFieldErrors } from '@inquirydesk/shared';
import { describe, expect, it } from 'vitest';

describe('inquiry validation (shared by API and UI)', () => {
  it.each(['dilani@example.com', '+94 77 123 4567', '(011) 234-5678', '0771234567'])('accepts contact %s', (contact) => {
    expect(isValidContact(contact)).toBe(true);
  });

  it.each(['dilani', 'dilani@', '12345', '+94 77 ABC 4567', '1234567890123456'])('rejects contact %s', (contact) => {
    expect(isValidContact(contact)).toBe(false);
  });

  it('treats whitespace-only text as missing and reports one message per field', () => {
    const result = createInquirySchema.safeParse({ customerName: '   ', contact: '', subject: 'Hi', description: 'short' });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!)).toEqual({
      customerName: 'Customer name is required.',
      contact: 'Add an email or phone number so we can reply.',
      subject: 'Subject must be at least 3 characters.',
      description: 'Add a bit more detail (at least 10 characters).',
    });
  });

  it('trims values before storing them', () => {
    const result = createInquirySchema.parse({
      customerName: '  Dilani Jayasuriya ',
      contact: ' dilani@example.com ',
      subject: ' Delivery delayed ',
      description: '  Order #5521 has not arrived.  ',
    });
    expect(result).toMatchObject({ customerName: 'Dilani Jayasuriya', contact: 'dilani@example.com', subject: 'Delivery delayed' });
  });
});
