import { prisma } from '@/lib/db';
import { safeSendPush } from '@/features/firebase/messaging';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  postId?: string;
  actorId?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        postId: input.postId,
        actorId: input.actorId,
      },
    });

    // Send push notification
    await safeSendPush(input.userId, {
      title: input.title,
      body: input.body,
      data: {
        type: input.type,
        ...(input.postId ? { postId: input.postId } : {}),
      },
    });
  } catch (e) {
    // Notification failures should not break the main flow
    console.warn('Failed to create notification:', e);
  }
}

export async function getNotifications(
  userId: string,
  limit = 30,
  offset = 0
) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      ...(notificationIds ? { id: { in: notificationIds } } : {}),
    },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
