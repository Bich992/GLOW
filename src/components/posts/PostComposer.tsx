'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { Send, RefreshCw, ImagePlus, Music, Video, X, Waves } from 'lucide-react';

const MAX_CHARS = 300;
const MAX_AUDIO_SECONDS = 30;
const MAX_VIDEO_SECONDS = 15;

const postSchema = z.object({
  content: z.string().min(1, 'Il post non può essere vuoto').max(MAX_CHARS, `Massimo ${MAX_CHARS} caratteri`),
});
type PostFormData = z.infer<typeof postSchema>;
type MediaFile = { file: File; previewUrl: string; type: 'image' | 'audio' | 'video' };

export function PostComposer() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
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
  const isNearLimit = charCount > 250;
  const isOverLimit = charCount > MAX_CHARS;
  const pct = Math.min(100, (charCount / MAX_CHARS) * 100);
  const ringColor = isOverLimit ? '#ef4444' : isNearLimit ? '#f97316' : '#22d3ee';

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
    if (file.size > 10 * 1024 * 1024) { setMediaError('Immagine troppo grande (max 10 MB)'); return; }
    if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
    setMedia({ file, previewUrl: URL.createObjectURL(file), type: 'image' });
  };

  const validateAndSetAV = (file: File, type: 'audio' | 'video') => {
    setMediaError(null);
    const maxSec = type === 'audio' ? MAX_AUDIO_SECONDS : MAX_VIDEO_SECONDS;
    const url = URL.createObjectURL(file);
    const el = document.createElement(type);
    el.preload = 'metadata';
    el.src = url;
    el.onloadedmetadata = () => {
      if (el.duration > maxSec) {
        URL.revokeObjectURL(url);
        setMediaError(type === 'audio' ? `Audio ≤ ${maxSec}s` : `Video ≤ ${maxSec}s`);
        return;
      }
      if (media?.previewUrl) URL.revokeObjectURL(media.previewUrl);
      setMedia({ file, previewUrl: url, type });
    };
    el.onerror = () => { URL.revokeObjectURL(url); setMediaError('File non leggibile'); };
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.url as string;
    } catch {
      toast({ title: 'Upload fallito', variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (data: PostFormData) => {
    if (!user) { toast({ title: 'Accedi per pubblicare', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      const body: Record<string, string> = { content: data.content };

      if (media) {
        const uploadedUrl = await uploadMedia(media.file);
        if (!uploadedUrl) { setLoading(false); return; }
        if (media.type === 'image') body.imageUrl = uploadedUrl;
        else if (media.type === 'audio') body.audioUrl = uploadedUrl;
        else body.videoUrl = uploadedUrl;
      }

      const localHour = new Date().getHours();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Local-Hour': String(localHour) },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error((err as { error?: string }).error ?? 'Errore nella pubblicazione');
      }

      const result = await res.json();
      await refreshUser();
      toast({ title: '✨ Post pubblicato!', description: 'Il tuo post è ora live.' });
      router.push(`/posts/${(result as { id: string }).id}`);
    } catch (e) {
      toast({ title: 'Errore', description: e instanceof Error ? e.message : 'Errore generico', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !loading && !uploading && content.trim().length > 0 && !isOverLimit && !mediaError;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-white/5">
        <Waves className="h-4 w-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white/80">Nuovo Post</span>
        <span className="ml-auto text-[11px] text-white/30">
          {media ? `📎 ${media.type}` : '📝 Solo testo OK'}
        </span>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="p-4 space-y-3">
          {/* Textarea */}
          <Textarea
            {...form.register('content')}
            placeholder="Cosa vuoi condividere? Testo, emozioni, idee… il media è facoltativo."
            className="min-h-[110px] resize-none bg-transparent border-white/10 text-white placeholder:text-white/25 focus-visible:ring-cyan-500/40 text-[15px] leading-relaxed"
            maxLength={MAX_CHARS}
          />

          {/* Char counter ring */}
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5"/>
              <circle
                cx="10" cy="10" r="8"
                fill="none"
                stroke={ringColor}
                strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${2 * Math.PI * 8 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 10 10)"
                style={{ transition: 'stroke-dashoffset 0.2s, stroke 0.2s' }}
              />
            </svg>
            <span className={`text-xs ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-orange-400' : 'text-white/30'}`}>
              {MAX_CHARS - charCount} rimasti
            </span>
            {form.formState.errors.content && (
              <span className="text-xs text-destructive ml-auto">{form.formState.errors.content.message}</span>
            )}
          </div>

          {/* Media preview */}
          <AnimatePresence>
            {media && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="relative rounded-xl overflow-hidden border border-white/10"
              >
                {media.type === 'image' && (
                  <Image src={media.previewUrl} alt="Preview" width={600} height={400}
                    className="w-full object-cover max-h-52" />
                )}
                {media.type === 'audio' && (
                  <div className="p-3 bg-white/5">
                    <audio controls src={media.previewUrl} className="w-full h-8" />
                  </div>
                )}
                {media.type === 'video' && (
                  <video controls src={media.previewUrl} className="w-full max-h-52" />
                )}
                <button type="button" onClick={removeMedia}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-red-900/70 transition-colors">
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {mediaError && <p className="text-xs text-destructive">{mediaError}</p>}

          {/* Media buttons (hidden inputs) */}
          <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleImageSelect} />
          <input ref={audioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetAV(f, 'audio'); }} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) validateAndSetAV(f, 'video'); }} />

          {!media && (
            <div className="flex gap-2 flex-wrap">
              {[
                { icon: ImagePlus, label: 'Foto', onClick: () => imageRef.current?.click() },
                { icon: Music, label: 'Audio ≤30s', onClick: () => audioRef.current?.click() },
                { icon: Video, label: 'Video ≤15s', onClick: () => videoRef.current?.click() },
              ].map(({ icon: Icon, label, onClick }) => (
                <button key={label} type="button" onClick={onClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-white/40 hover:text-white/70 hover:border-white/20 transition-colors">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <p className="text-[11px] text-white/20">
            🌊 Pubblica durante un&apos;Onda per +30min extra
          </p>
          <Button
            type="submit"
            disabled={!canSubmit}
            size="sm"
            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-full px-5 gap-1.5 disabled:opacity-30"
          >
            {loading || uploading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {uploading ? 'Upload...' : 'Pubblica'}
          </Button>
        </div>
      </form>
    </div>
  );
}
