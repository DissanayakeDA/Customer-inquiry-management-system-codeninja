import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginScreen } from '@/components/auth/login-screen';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  // LoginScreen reads ?next= and ?reason= from the URL, which requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
