import type { InquiryDto } from '@inquirydesk/shared';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, type Agent, type TestContext } from '../support/test-context';

const validInquiry = {
  customerName: 'Dilani Jayasuriya',
  contact: 'dilani@example.com',
  subject: 'Delivery delayed for order #5521',
  description: 'Ordered on Monday, promised within 2 days, still not received.',
};

async function createInquiry(agent: Agent, overrides: Record<string, unknown> = {}): Promise<InquiryDto> {
  const res = await agent.post('/api/inquiries').send({ ...validInquiry, ...overrides });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as InquiryDto;
}

describe('Inquiries API', () => {
  let ctx: TestContext;
  let ayesha: Agent;
  let kasun: Agent;
  let admin: Agent;

  beforeAll(async () => {
    ctx = await createTestContext();
    [ayesha, kasun, admin] = await Promise.all([ctx.signIn('ayesha'), ctx.signIn('kasun'), ctx.signIn('admin')]);
  });
  afterAll(async () => {
    await ctx?.close();
  });
  beforeEach(async () => {
    await ctx.resetInquiries();
  });

  // ------------------------------------------------------------------ capture & validation

  describe('POST /api/inquiries', () => {
    it('records an inquiry as New, created by the signed-in user', async () => {
      const res = await ayesha.post('/api/inquiries').send(validInquiry);

      expect(res.status).toBe(201);
      expect(res.headers.location).toBe(`/api/inquiries/${res.body.id}`);
      expect(res.body).toMatchObject({
        reference: `INQ-${res.body.id}`,
        status: 'new',
        version: 1,
        createdBy: { id: ctx.userId('ayesha'), name: 'Ayesha Fernando' },
        assignedTo: null,
      });
    });

    it('rejects missing and invalid fields with 400 and a message per field, without saving anything', async () => {
      // Calling the API directly: the browser's validation is not involved at all.
      const res = await ayesha.post('/api/inquiries').send({ customerName: '   ', contact: 'call me maybe', subject: 'Hi' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fieldErrors).toEqual({
        customerName: 'Customer name is required.',
        contact: 'Enter a valid email (name@example.com) or phone number (7–15 digits).',
        subject: 'Subject must be at least 3 characters.',
        description: 'Describe what the customer needs.',
      });

      const list = await ayesha.get('/api/inquiries');
      expect(list.body.total).toBe(0);
    });

    it('rejects malformed JSON with 400 instead of a server error', async () => {
      const res = await ayesha.post('/api/inquiries').set('Content-Type', 'application/json').send('{"customerName":');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });

    it('ignores a client-supplied status: new inquiries always start as New', async () => {
      const created = await createInquiry(ayesha, { status: 'resolved' });
      expect(created.status).toBe('new');
    });

    it('rejects assignment to a staff member that does not exist', async () => {
      const res = await ayesha.post('/api/inquiries').send({ ...validInquiry, assignedToId: 999_999 });
      expect(res.status).toBe(400);
      expect(res.body.error.fieldErrors).toEqual({ assignedToId: 'The selected staff member does not exist.' });
    });

    it('refuses a second open inquiry for the same contact and subject, pointing to the existing one', async () => {
      const first = await createInquiry(ayesha);

      // Same customer request, typed slightly differently.
      const res = await ayesha
        .post('/api/inquiries')
        .send({ ...validInquiry, contact: ' DILANI@example.com ', subject: 'delivery  delayed for ORDER #5521' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_INQUIRY');
      expect(res.body.error.details.existing).toEqual({ id: first.id, reference: first.reference, status: 'new', accessible: true });
    });

    it('lets exactly one of two simultaneous identical submissions through (double-click, two tabs)', async () => {
      const responses = await Promise.all([
        ayesha.post('/api/inquiries').send(validInquiry),
        kasun.post('/api/inquiries').send(validInquiry),
      ]);

      // Both requests pass the application code at the same moment; the database's partial unique index decides.
      expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
      const list = await admin.get('/api/inquiries');
      expect(list.body.total).toBe(1);
    });

    it('lets exactly one of two simultaneous status changes of the same version through', async () => {
      const created = await createInquiry(ayesha, { assignedToId: ctx.userId('kasun') });

      const responses = await Promise.all([
        ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 }),
        kasun.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 }),
      ]);

      expect(responses.map((res) => res.status).sort()).toEqual([200, 409]);
      const after = await admin.get(`/api/inquiries/${created.id}`);
      expect(after.body.version).toBe(2);
    });

    it('allows the same contact and subject again once the earlier inquiry is resolved', async () => {
      const first = await createInquiry(ayesha);
      const started = await ayesha.patch(`/api/inquiries/${first.id}/status`).send({ status: 'in_progress', version: 1 });
      await ayesha.patch(`/api/inquiries/${first.id}/status`).send({ status: 'resolved', version: started.body.version }).expect(200);

      await createInquiry(ayesha);
    });
  });

  // ------------------------------------------------------------------ access rule

  describe('access rule: agents see what they created or are assigned to; admins see everything', () => {
    it("returns 404 for a direct link to another agent's inquiry, and leaves it out of their list", async () => {
      const kasunsInquiry = await createInquiry(kasun);

      const direct = await ayesha.get(`/api/inquiries/${kasunsInquiry.id}`);
      expect(direct.status).toBe(404);
      expect(direct.body.error.code).toBe('NOT_FOUND');

      const list = await ayesha.get('/api/inquiries');
      expect(list.body.items).toEqual([]);
      expect(list.body.counts.all).toBe(0);

      await admin.get(`/api/inquiries/${kasunsInquiry.id}`).expect(200);
      await kasun.get(`/api/inquiries/${kasunsInquiry.id}`).expect(200);
    });

    it("cannot change another agent's inquiry by calling the API directly", async () => {
      const kasunsInquiry = await createInquiry(kasun);

      const statusChange = await ayesha.patch(`/api/inquiries/${kasunsInquiry.id}/status`).send({ status: 'in_progress', version: 1 });
      const reassignment = await ayesha.patch(`/api/inquiries/${kasunsInquiry.id}/assignee`).send({ assigneeId: ctx.userId('ayesha'), version: 1 });

      expect(statusChange.status).toBe(404);
      expect(reassignment.status).toBe(404);
      const unchanged = await kasun.get(`/api/inquiries/${kasunsInquiry.id}`);
      expect(unchanged.body).toMatchObject({ status: 'new', version: 1, assignedTo: null });
    });

    it('gives access to the assignee once an inquiry is handed over', async () => {
      const created = await createInquiry(kasun);
      await kasun.patch(`/api/inquiries/${created.id}/assignee`).send({ assigneeId: ctx.userId('ayesha'), version: 1 }).expect(200);

      await ayesha.get(`/api/inquiries/${created.id}`).expect(200);
    });

    it('returns 400 for a malformed id and 404 for an id that does not exist', async () => {
      for (const badId of ['abc', '12abc', '-5', '0', '99999999999']) {
        const res = await ayesha.get(`/api/inquiries/${badId}`);
        expect(res.status, badId).toBe(400);
        expect(res.body.error.code).toBe('INVALID_ID');
      }
      const missing = await ayesha.get('/api/inquiries/424242');
      expect(missing.status).toBe(404);
    });
  });

  // ------------------------------------------------------------------ lifecycle

  describe('PATCH /api/inquiries/:id/status', () => {
    it('rejects New → Resolved with 422 and leaves the inquiry unchanged', async () => {
      const created = await createInquiry(ayesha);

      const res = await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'resolved', version: 1 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
      expect(res.body.error.details).toEqual({ from: 'new', to: 'resolved', allowed: ['in_progress'] });
      const after = await ayesha.get(`/api/inquiries/${created.id}`);
      expect(after.body).toMatchObject({ status: 'new', version: 1 });
    });

    it('starts work: New → In Progress assigns the person who picked it up and bumps the version', async () => {
      const created = await createInquiry(ayesha);

      const res = await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'in_progress',
        version: 2,
        assignedTo: { id: ctx.userId('ayesha') },
        updatedBy: { id: ctx.userId('ayesha') },
      });
    });

    it('rejects a change based on a stale version with 409 and returns the current record', async () => {
      const created = await createInquiry(ayesha, { assignedToId: ctx.userId('kasun') });

      // "Tab A" (Kasun) moves it forward twice; "tab B" (Ayesha) still shows version 1 / New.
      const started = await kasun.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 });
      await kasun.patch(`/api/inquiries/${created.id}/status`).send({ status: 'resolved', version: started.body.version }).expect(200);

      const stale = await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 });

      // Without the version check this would have silently reopened the resolved inquiry.
      expect(stale.status).toBe(409);
      expect(stale.body.error.code).toBe('STALE_VERSION');
      expect(stale.body.error.details.current).toMatchObject({ status: 'resolved', version: 3, updatedBy: { name: 'Kasun Silva' } });
    });

    it('allows reopening a resolved inquiry', async () => {
      const created = await createInquiry(ayesha);
      await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 1 }).expect(200);
      await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'resolved', version: 2 }).expect(200);

      const reopened = await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress', version: 3 });
      expect(reopened.status).toBe(200);
      expect(reopened.body).toMatchObject({ status: 'in_progress', version: 4 });
    });

    it('requires the version the client last saw', async () => {
      const created = await createInquiry(ayesha);
      const res = await ayesha.patch(`/api/inquiries/${created.id}/status`).send({ status: 'in_progress' });
      expect(res.status).toBe(400);
      expect(res.body.error.fieldErrors).toHaveProperty('version');
    });
  });

  // ------------------------------------------------------------------ finding inquiries

  describe('GET /api/inquiries', () => {
    it('searches by customer, contact, subject or reference and filters by status', async () => {
      const refund = await createInquiry(ayesha, { customerName: 'Sachini W', contact: 'sachini@example.com', subject: 'Refund not received' });
      await createInquiry(ayesha, { customerName: 'Ruwan B', contact: '+94 77 123 4567', subject: 'Bulk pricing' });
      await ayesha.patch(`/api/inquiries/${refund.id}/status`).send({ status: 'in_progress', version: 1 }).expect(200);

      const bySubject = await ayesha.get('/api/inquiries').query({ q: 'refund' });
      expect(bySubject.body.items.map((i: InquiryDto) => i.id)).toEqual([refund.id]);

      const byReference = await ayesha.get('/api/inquiries').query({ q: refund.reference.toLowerCase() });
      expect(byReference.body.items.map((i: InquiryDto) => i.id)).toEqual([refund.id]);

      const byStatus = await ayesha.get('/api/inquiries').query({ status: 'new' });
      expect(byStatus.body.items.map((i: InquiryDto) => i.customerName)).toEqual(['Ruwan B']);
      expect(byStatus.body.counts).toEqual({ all: 2, new: 1, in_progress: 1, resolved: 0 });

      const wildcard = await ayesha.get('/api/inquiries').query({ q: '%' });
      expect(wildcard.body.total).toBe(0);
    });

    it('rejects unknown filter values with 400', async () => {
      const res = await ayesha.get('/api/inquiries').query({ status: 'closed' });
      expect(res.status).toBe(400);
      expect(res.body.error.fieldErrors).toHaveProperty('status');
    });
  });

  it('returns JSON 404 for unknown API routes (after authentication, so routes are not discoverable)', async () => {
    const anonymous = await request(ctx.app).get('/api/nope');
    expect(anonymous.status).toBe(401);

    const res = await ayesha.get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
