import type { Metadata } from 'next';
import { SignupForm } from '@/components/auth/SignupForm';
import { PageWrapper } from '@/components/layout/PageWrapper';

export const metadata: Metadata = {
  title: 'Create Account',
};

export default function SignupPage() {
  return (
    <PageWrapper maxWidth="sm" className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <SignupForm />
    </PageWrapper>
  );
}
