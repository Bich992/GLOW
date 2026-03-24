import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const user = await getServerSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF and WebP allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
    const filename = `${randomUUID()}.${ext}`;

    // 1. Try Supabase Storage (preferred — works on Vercel)
    const supabaseUrl = await trySupabaseUpload(buffer, file.type, filename, user.id);
    if (supabaseUrl) {
      return NextResponse.json({ url: supabaseUrl });
    }

    // 2. Try Firebase Storage
    const firebaseUrl = await tryFirebaseUpload(buffer, file.type, filename, user.id);
    if (firebaseUrl) {
      return NextResponse.json({ url: firebaseUrl });
    }

    // 3. Fallback: local filesystem (dev only — NOT persistent on Vercel)
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (e) {
    console.error('Upload error:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

async function trySupabaseUpload(
  buffer: Buffer,
  contentType: string,
  filename: string,
  userId: string
): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const path = `${userId}/${filename}`;
    const { error } = await admin.storage
      .from('post-images')
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      console.warn('Supabase Storage upload error:', error.message);
      return null;
    }

    const { data } = admin.storage.from('post-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn('Supabase Storage unavailable:', e);
    return null;
  }
}

async function tryFirebaseUpload(
  buffer: Buffer,
  contentType: string,
  filename: string,
  userId: string
): Promise<string | null> {
  try {
    const { getAdminApp } = await import('@/features/firebase/admin');
    const app = getAdminApp();
    if (!app) return null;

    const admin = await import('firebase-admin');
    const bucket = admin.storage(app).bucket();
    if (!bucket.name) return null;

    const filePath = `uploads/${userId}/${filename}`;
    const fileRef = bucket.file(filePath);
    await fileRef.save(buffer, { metadata: { contentType } });
    await fileRef.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  } catch {
    return null;
  }
}
