'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useSessionQuery, useSignIn } from '@/hooks/use-session';
import { errorMessage } from '@/lib/api';
import { safeRedirectPath } from '@/lib/format';
import { Brand } from '../layout/brand';
import { Alert } from '../ui/alert';
import { LoginForm } from './login-form';

export function LoginScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get('next'));
  const sessionExpired = params.get('reason') === 'expired';

  const session = useSessionQuery();
  const signIn = useSignIn();

  // Already signed in (or just signed in): continue to where the user was going.
  useEffect(() => {
    if (session.data) router.replace(next);
  }, [session.data, next, router]);

  return (
    <section className="login">
      <div className="login-brand">
        <Brand />
        <div>
          {/* Decorative: the headline below says the same thing, so screen readers skip it. */}
          <Image
            className="login-art"
            src="/illustrations/customer-relationship-bro.svg"
            alt=""
            width={750}
            height={500}
            loading="eager"
          />
          <h1>Every customer inquiry, owned and tracked to resolution.</h1>
          <p>Replace scattered chat threads and spreadsheets with one place to record, assign and resolve customer requests.</p>
          <ul className="login-points">
            <li><span>✓</span> Know who is handling each request</li>
            <li><span>✓</span> See status at a glance: New, In Progress, Resolved</li>
            <li><span>✓</span> Find any inquiry by customer, contact or subject</li>
          </ul>
        </div>
        <small className="login-foot">Internal staff workspace</small>
      </div>

      <div className="login-panel">
        <div className="login-card">
          {/* Shown only on narrow screens, where the brand panel (and its illustration) is hidden. */}
          <Image
            className="login-card-art"
            src="/illustrations/customer-relationship-rafiki.svg"
            alt=""
            width={500}
            height={500}
          />
          <h2>Sign in</h2>
          <p>Use your staff account to access the workspace.</p>

          {signIn.error ? (
            <div className="login-alert">
              <Alert tone="error" title={errorMessage(signIn.error)} />
            </div>
          ) : sessionExpired ? (
            <div className="login-alert">
              <Alert tone="warn" title="Your session has expired.">
                Please sign in again to continue where you left off.
              </Alert>
            </div>
          ) : null}

          <LoginForm submitting={signIn.isPending || signIn.isSuccess} onSubmit={(credentials) => signIn.mutate(credentials)} />
        </div>
      </div>
    </section>
  );
}
