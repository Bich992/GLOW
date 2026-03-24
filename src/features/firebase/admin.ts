import * as admin from 'firebase-admin';

function isAdminConfigured(): boolean {
  return !!(
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
}

let adminApp: admin.app.App | null = null;

export function getAdminApp(): admin.app.App | null {
  if (!isAdminConfigured()) return null;

  if (admin.apps.length === 0) {
    try {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (e) {
      console.error('Firebase Admin initialization failed:', e);
      return null;
    }
  } else {
    adminApp = admin.apps[0];
  }

  return adminApp;
}

export function getAdminAuth(): admin.auth.Auth | null {
  const app = getAdminApp();
  if (!app) return null;
  return admin.auth(app);
}

export function getAdminMessaging(): admin.messaging.Messaging | null {
  const app = getAdminApp();
  if (!app) return null;
  return admin.messaging(app);
}

export { isAdminConfigured };
