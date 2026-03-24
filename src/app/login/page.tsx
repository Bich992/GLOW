import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { PageWrapper } from '@/components/layout/PageWrapper';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <PageWrapper maxWidth="sm" className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <LoginForm />
    </PageWrapper>
  );
}
