import { getAdminApp } from './admin';

export async function safeUploadFile(
  file: Buffer,
  filename: string,
  contentType: string,
  postId: string
): Promise<string | null> {
  const app = getAdminApp();
  if (!app) {
    console.warn('Firebase Storage not configured - skipping file upload');
    return null;
  }

  try {
    const admin = await import('firebase-admin');
    const bucket = admin.storage(app).bucket();
    const filePath = `posts/${postId}/${filename}`;
    const fileRef = bucket.file(filePath);

    await fileRef.save(file, {
      metadata: {
        contentType,
      },
    });

    await fileRef.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    return publicUrl;
  } catch (e) {
    console.error('Failed to upload file to Firebase Storage:', e);
    return null;
  }
}

export async function safeDeleteFile(filePath: string): Promise<void> {
  const app = getAdminApp();
  if (!app) return;

  try {
    const admin = await import('firebase-admin');
    const bucket = admin.storage(app).bucket();
    await bucket.file(filePath).delete();
  } catch (e) {
    console.warn('Failed to delete file from Firebase Storage:', e);
  }
}
