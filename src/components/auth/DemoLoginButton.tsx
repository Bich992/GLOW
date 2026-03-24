'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { RefreshCw, FlaskConical } from 'lucide-react';

const DEMO_USERS = [
  { username: 'alice', label: 'Alice', description: '15.50 TIMT' },
  { username: 'bob', label: 'Bob', description: '8.25 TIMT' },
  { username: 'charlie', label: 'Charlie', description: '22.00 TIMT' },
];

export function DemoLoginButton() {
  const router = useRouter();
  const { signInAsDemo } = useAuth();
  const { toast } = useToast();
  const [loadingUser, setLoadingUser] = useState<string | null>(null);

  const handleDemo = async (username: string) => {
    setLoadingUser(username);
    try {
      await signInAsDemo(username);
      router.push('/feed');
    } catch (e) {
      toast({
        title: 'Demo login failed',
        description: e instanceof Error ? e.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoadingUser(null);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-dashed">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FlaskConical className="h-4 w-4" />
        Demo Mode — Try without signing up
      </div>
      <div className="grid grid-cols-3 gap-2">
        {DEMO_USERS.map(({ username, label, description }) => (
          <Button
            key={username}
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-2 gap-0.5"
            onClick={() => handleDemo(username)}
            disabled={loadingUser !== null}
          >
            {loadingUser === username ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
