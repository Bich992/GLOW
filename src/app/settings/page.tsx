'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTheme } from 'next-themes';
import { RefreshCw, Moon, Sun, Monitor, Camera, ImagePlus } from 'lucide-react';

const profileSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(200).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatarUrl ?? '');
  const [headerPreview, setHeaderPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      bio: '',
      website: '',
      location: '',
    },
  });

  const uploadImage = async (file: File): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Immagine troppo grande (max 5MB)', variant: 'destructive' });
      return null;
    }
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    if (!res.ok) return null;
    const data = await res.json();
    return data.url as string;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file);
      if (!url) throw new Error();
      setAvatarPreview(url);
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: url }),
      });
      await refreshUser();
      toast({ title: 'Foto profilo aggiornata!' });
    } catch {
      toast({ title: 'Upload fallito', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleHeaderChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeader(true);
    try {
      const url = await uploadImage(file);
      if (!url) throw new Error();
      setHeaderPreview(url);
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headerUrl: url }),
      });
      toast({ title: 'Immagine di copertina aggiornata!' });
    } catch {
      toast({ title: 'Upload fallito', variant: 'destructive' });
    } finally {
      setUploadingHeader(false);
    }
  };

  const handleSave = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      await refreshUser();
      toast({ title: 'Profilo aggiornato!' });
    } catch (e) {
      toast({
        title: 'Aggiornamento fallito',
        description: e instanceof Error ? e.message : 'Qualcosa è andato storto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const themes = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <PageWrapper maxWidth="md">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Avatar + Header */}
        <Card>
          <CardHeader>
            <CardTitle>Immagini profilo</CardTitle>
            <CardDescription>Foto profilo e immagine di copertina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Header banner */}
            <div className="relative h-32 rounded-lg bg-muted overflow-hidden border cursor-pointer"
              onClick={() => headerInputRef.current?.click()}>
              {headerPreview ? (
                <Image src={headerPreview} alt="Header" fill className="object-cover" />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors text-white gap-2">
                {uploadingHeader ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-sm font-medium">Cambia copertina</span>
                  </>
                )}
              </div>
              <input
                ref={headerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleHeaderChange}
              />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarPreview || undefined} />
                  <AvatarFallback className="text-2xl">
                    {user?.displayName?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                  {uploadingAvatar ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="font-medium">{user?.displayName}</p>
                <p className="text-sm text-muted-foreground">@{user?.username}</p>
                <Button type="button" variant="outline" size="sm" className="mt-2"
                  onClick={() => avatarInputRef.current?.click()}>
                  Cambia foto
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile info */}
        <Card>
          <CardHeader>
            <CardTitle>Profilo</CardTitle>
            <CardDescription>Aggiorna le informazioni pubbliche del tuo profilo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Nome visualizzato</Label>
                <Input id="displayName" {...form.register('displayName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" {...form.register('bio')}
                  placeholder="Raccontati..." className="resize-none" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Sito web</Label>
                <Input id="website" placeholder="https://esempio.com" {...form.register('website')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Posizione</Label>
                <Input id="location" placeholder="Milano, Italia" {...form.register('location')} />
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <RefreshCw className="h-4 w-4 animate-spin mr-2" />}
                Salva modifiche
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Aspetto</CardTitle>
            <CardDescription>Scegli il tema preferito</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themes.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                  }`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader><CardTitle>Account</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Username</p>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
              </div>
            )}
            <Separator />
            <Button variant="destructive"
              onClick={() => signOut().then(() => { window.location.href = '/'; })}>
              Esci
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
