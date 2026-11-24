'use client';

import { loginSchema, toFieldErrors, type FieldErrors, type LoginData } from '@inquirydesk/shared';
import { useState, type FormEvent } from 'react';
import { Field } from '../ui/field';
import { Spinner } from '../ui/primitives';

const DEMO_ACCOUNTS = [
  { email: 'ayesha@inquirydesk.test', role: 'Agent' },
  { email: 'kasun@inquirydesk.test', role: 'Agent' },
  { email: 'nimal@inquirydesk.test', role: 'Admin' },
] as const;
const DEMO_PASSWORD = 'Password123!';

interface LoginFormProps {
  submitting: boolean;
  onSubmit: (credentials: LoginData) => void;
}

export function LoginForm({ submitting, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setErrors({});
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="stack">
        <Field id="email" label="Work email" error={errors.email}>
          {(control) => (
            <input
              {...control}
              className="input"
              type="email"
              autoComplete="username"
              placeholder="you@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        <Field id="password" label="Password" error={errors.password}>
          {(control) => (
            <input
              {...control}
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="demo-accounts">
        <b>Seeded test accounts</b>
        {DEMO_ACCOUNTS.map((account) => (
          <button key={account.email} type="button" onClick={() => fillDemoAccount(account.email)}>
            {account.email} <span>{account.role}</span>
          </button>
        ))}
        <div className="faint" style={{ marginTop: 6 }}>
          Password for all: <span className="mono">{DEMO_PASSWORD}</span>
        </div>
      </div>
    </>
  );
}
