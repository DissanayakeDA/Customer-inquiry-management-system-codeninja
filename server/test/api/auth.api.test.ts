import { SESSION_COOKIE_NAME } from '@inquirydesk/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext } from '../support/test-context';

describe('Authentication (API)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => {
    await ctx?.close();
  });

  it('signs in with valid credentials and sets an httpOnly session cookie', async () => {
    const res = await request(ctx.app)
      .post('/api/auth/login')
      .send({ email: 'Ayesha@InquiryDesk.test', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'ayesha@inquirydesk.test', role: 'agent' });
    expect(res.body.user).not.toHaveProperty('passwordHash');
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('gives the same generic error for an unknown email and a wrong password', async () => {
    const unknown = await request(ctx.app).post('/api/auth/login').send({ email: 'nobody@inquirydesk.test', password: 'x' });
    const wrong = await request(ctx.app).post('/api/auth/login').send({ email: 'ayesha@inquirydesk.test', password: 'wrong' });

    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(wrong.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' });
  });

  it('validates the login body', async () => {
    const res = await request(ctx.app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toEqual({ email: 'Enter a valid email address.', password: 'Password is required.' });
  });

  it('rejects protected endpoints without a session (401), regardless of the frontend', async () => {
    for (const [method, path] of [['get', '/api/inquiries'], ['get', '/api/inquiries/1001'], ['post', '/api/inquiries'], ['get', '/api/auth/me']] as const) {
      const res = await request(ctx.app)[method](path);
      expect(res.status, `${method.toUpperCase()} ${path}`).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a forged or tampered session token', async () => {
    const res = await request(ctx.app).get('/api/auth/me').set('Cookie', `${SESSION_COOKIE_NAME}=eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.`);
    expect(res.status).toBe(401);
  });

  it('ends the session on logout', async () => {
    const agent = await ctx.signIn('ayesha');
    await agent.get('/api/auth/me').expect(200);
    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });
});
