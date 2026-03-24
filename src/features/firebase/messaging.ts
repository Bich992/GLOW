import { getAdminMessaging } from './admin';
import { prisma } from '@/lib/db';

export interface PushPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export async function safeSendPush(userId: string, payload: PushPayload): Promise<void> {
  const messaging = getAdminMessaging();
  if (!messaging) {
    console.warn('Firebase Messaging not configured - skipping push notification');
    return;
  }

  try {
    const tokens = await prisma.fcmToken.findMany({
      where: { userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const tokenList = tokens.map((t) => t.token);

    const message: import('firebase-admin/messaging').MulticastMessage = {
      tokens: tokenList,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/icons/icon-192.png',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Clean up invalid tokens
    const invalidTokens: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(tokenList[idx]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await prisma.fcmToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }
  } catch (e) {
    console.error('Failed to send push notification:', e);
  }
}

export async function registerFcmToken(userId: string, token: string, deviceInfo?: string): Promise<void> {
  try {
    await prisma.fcmToken.upsert({
      where: { token },
      create: { userId, token, deviceInfo },
      update: { userId, deviceInfo, updatedAt: new Date() },
    });
  } catch (e) {
    console.error('Failed to register FCM token:', e);
  }
}
