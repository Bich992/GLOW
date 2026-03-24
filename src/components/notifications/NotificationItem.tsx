'use client';

import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, UserPlus, Zap, Clock, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationData } from '@/types';

const NOTIFICATION_ICONS = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  boost: Zap,
  extend: Clock,
  expire_soon: Clock,
  system: Bell,
};

interface NotificationItemProps {
  notification: NotificationData;
  onRead?: (id: string) => void;
}

export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type as keyof typeof NOTIFICATION_ICONS] ?? Bell;

  const ICON_COLORS: Record<string, string> = {
    like: 'text-red-500',
    comment: 'text-blue-500',
    follow: 'text-green-500',
    boost: 'text-yellow-500',
    extend: 'text-purple-500',
    expire_soon: 'text-orange-500',
    system: 'text-muted-foreground',
  };
  const iconColor = ICON_COLORS[notification.type] ?? 'text-muted-foreground';

  const href = notification.postId ? `/posts/${notification.postId}` : '#';

  return (
    <Link
      href={href}
      onClick={() => !notification.read && onRead?.(notification.id)}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg transition-colors hover:bg-muted/50',
        !notification.read && 'bg-primary/5'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.read && 'font-medium')}>{notification.body}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
      {!notification.read && (
        <div className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-primary" />
      )}
    </Link>
  );
}
