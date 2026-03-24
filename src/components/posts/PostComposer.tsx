'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { Send, RefreshCw, ImagePlus, Music, Video, X } from 'lucide-react';

const MAX_CHARS = 300;
const MAX_AUDIO_SECONDS = 30;
const MAX_VIDEO_SECONDS = 15;

const postSchema = z.object({
  content: z
    .string()
    .min(1, 'Post cannot be empty')
    .max(MAX_CHARS, `Post must be ${MAX_CHARS} characters or less`),
});

type PostFormData = z.infer<typeof postSchema>;
type MediaFile = { file: File; previewUrl: string; type: 'image' | 'audio' | 'video' };

export function PostComposer() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaFile | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: '' },
  });

  const content = form.watch('content');
  const charCount = content.length;
  const isNearLimit = charCount > 270;
  const isOverLimit = charCount > MAX_CHARS;

  const removeMedia = () => {
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia(null);
    setMediaError(null);
    if (imageRef.current) imageRef.current.value = '';
    if (audioRef.current) audioRef.current.value = '';
    if (videoRef.current) videoRef.current.value = '';
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError(null);
    if (file.size > 10 * 1024 * 1024) {
      setMediaError('Image too large (max 10 MB)');
      return;
    }
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({ file, previewUrl: URL.createObjectURL(file), type: 'image' });
  };

  const validateAndSetAudioVideo = (file: File, type: 'audio' | 'video') => {
    setMediaError(null);
    const maxSeconds = type === 'audio' ? MAX_AUDIO_SECONDS : MAX_VIDEO_SECONDS;
    const url = URL.createObjectURL(file);
    const el = document.createElement(type);
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => {
      if (el.duration > maxSeconds) {
        URL.revokeObjectURL(url);
        setMediaError(
          type === 'audio'
            ? `Audio must be ≤ ${MAX_AUDIO_SECONDS} seconds`
            : `Video must be ≤ ${MAX_VIDEO_SECONDS} seconds`
        );
        return;
      }
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
      setMedia({ file, previewUrl: url, type });
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      setMediaError('Could not read media file duration');
    };
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetAudioVideo(file, 'audio');
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetAudioVideo(file, 'video');
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      return data.url as string;
    } catch {
      toast({ title: 'Media upload failed', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (data: PostFormData) => {
    if (!user) {
      toast({ title: t.posts.pleaseSignIn, variant: 'destructive' });
      return;
    }
    if (!media) {
      toast({ title: 'Media required', description: 'Please attach an image, audio, or video.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const uploadedUrl = await uploadMedia(media.file);
      if (!uploadedUrl) {
        setLoading(false);
        return;
      }

      const body: Record<string, string> = { content: data.content };
      if (media.type === 'image') body.imageUrl = uploadedUrl;
      else if (media.type === 'audio') body.audioUrl = uploadedUrl;
      else body.videoUrl = uploadedUrl;

      // Pass local hour for wave-based lifetime adjustment
      const localHour = new Date().getHours();

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Local-Hour': String(localHour) },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to publish post');
      }

      const result = await res.json();
      await refreshUser();

      toast({ title: t.posts.published, description: t.posts.publishedDesc });
      router.push(`/posts/${result.id}`);
    } catch (e) {
      toast({
        title: t.posts.failedToPublish,
        description: e instanceof Error ? e.message : t.general.error,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !uploading && content.trim().length > 0 && !isOverLimit && !!media && !mediaError;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t.posts.createPost}</CardTitle>
      </CardHeader>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <CardContent className="space-y-4">
          <Textarea
            {...form.register('content')}
            placeholder={t.posts.whatsOnYourMind}
            className="min-h-[120px] resize-none text-base"
            maxLength={MAX_CHARS}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className={isOverLimit ? 'text-destructive font-medium' : isNearLimit ? 'text-orange-500 font-medium' : ''}>
              {charCount}/{MAX_CHARS} {t.posts.characters}
            </span>
            <span>{t.posts.livesFor}</span>
          </div>

          {form.formState.errors.content && (
            <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
          )}

          {/* Media preview */}
          {media && (
            <div className="relative rounded-lg overflow-hidden border">
              {media.type === 'image' && (
                <Image
                  src={media.previewUrl}
                  alt="Preview"
                  width={600}
                  height={400}
                  className="w-full object-cover max-h-64"
                />
              )}
              {media.type === 'audio' && (
                <audio controls src={media.previewUrl} className="w-full" />
              )}
              {media.type === 'video' && (
                <video controls src={media.previewUrl} className="w-full max-h-64" />
              )}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={removeMedia}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {mediaError && <p className="text-sm text-destructive">{mediaError}</p>}

          {/* Media picker — hidden inputs + buttons */}
          {!media && (
            <div className="flex gap-2 flex-wrap">
              <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />
              <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />
              <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />

              <Button type="button" variant="outline" size="sm" onClick={() => imageRef.current?.click()} className="gap-2 text-muted-foreground">
                <ImagePlus className="h-4 w-4" />
                {t.posts.addImage}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => audioRef.current?.click()} className="gap-2 text-muted-foreground">
                <Music className="h-4 w-4" />
                Audio (≤30s)
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => videoRef.current?.click()} className="gap-2 text-muted-foreground">
                <Video className="h-4 w-4" />
                Video (≤15s)
              </Button>
            </div>
          )}

          {!media && (
            <p className="text-xs text-muted-foreground">⚠ Media is required to publish</p>
          )}
        </CardContent>

        <CardFooter className="justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
            {t.posts.cancel}
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {loading || uploading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : t.posts.publish}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
