import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { PostComposer } from '@/components/posts/PostComposer';
import { PageWrapper } from '@/components/layout/PageWrapper';

export const metadata: Metadata = {
  title: 'New Post',
};

export default async function NewPostPage() {
  const user = await getServerSession();

  if (!user) {
    redirect('/login');
  }

  return (
    <PageWrapper maxWidth="md">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create a Post</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share a thought. It will live for 6 hours and then expire.
        </p>
      </div>
      <PostComposer />
    </PageWrapper>
  );
}
