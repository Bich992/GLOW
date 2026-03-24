'use client';

import React from 'react';
import { SWRConfig } from 'swr';

async function defaultFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const error = new Error('An error occurred while fetching');
    const data = await res.json().catch(() => ({}));
    (error as Error & { info: unknown; status: number }).info = data;
    (error as Error & { info: unknown; status: number }).status = res.status;
    throw error;
  }
  return res.json();
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: defaultFetcher,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
      }}
    >
      {children}
    </SWRConfig>
  );
}
