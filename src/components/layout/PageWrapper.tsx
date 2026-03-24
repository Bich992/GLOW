import React from 'react';
import { cn } from '@/lib/utils';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function PageWrapper({ children, className, maxWidth = 'lg' }: PageWrapperProps) {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  }[maxWidth];

  return (
    <main
      className={cn(
        'container mx-auto px-4 py-6 pb-24 md:pb-6',
        maxWidthClass,
        className
      )}
    >
      {children}
    </main>
  );
}
