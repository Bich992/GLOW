import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Zap, Coins, Diamond, RefreshCw } from 'lucide-react';
import { APP_NAME, CURRENCY_NAME } from '@/lib/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-timt-light/50 to-background dark:from-timt/5 dark:to-background">
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">✦</div>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Every moment glows.
            <br />
            <span className="text-timt">Make yours shine on {APP_NAME}.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-xl mx-auto">
            Share thoughts that matter right now. Every post lives and grows through interaction—
            or fades away. Earn {CURRENCY_NAME}. Boost what deserves to be seen.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/feed">Browse Feed</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How {APP_NAME} Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-timt" />}
              title="Organic Lifetime"
              description="Every post starts with 1 hour. Likes add 5 min, comments 15 min, echoes 30 min. Keep it alive through interaction."
            />
            <FeatureCard
              icon={<Coins className="h-8 w-8 text-timt" />}
              title={`Earn ${CURRENCY_NAME}`}
              description={`Get liked? Earn 0.05 ${CURRENCY_NAME}. Get commented on? Earn 0.20 ${CURRENCY_NAME}. High engagement earns bonus rewards.`}
            />
            <FeatureCard
              icon={<RefreshCw className="h-8 w-8 text-timt" />}
              title="Echo Posts"
              description="Reshare content with your own commentary. Every echo adds 30 minutes to the original post and rewards its author."
            />
            <FeatureCard
              icon={<Diamond className="h-8 w-8 text-timt" />}
              title="Crystallisation"
              description="Community votes can crystallise exceptional posts, making them permanent fixtures in the GLOW gallery."
            />
          </div>
        </div>
      </section>

      {/* Token Economics */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">The {CURRENCY_NAME} Economy</h2>
          <p className="text-muted-foreground mb-8">
            {CURRENCY_NAME} is the in-app token that powers {APP_NAME}&apos;s economy. Earn it through engagement,
            spend it to amplify content. Daily caps prevent inflation.
          </p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <StatCard label="Publishing" value="Free" />
            <StatCard label="Daily earn cap" value={`15 ${CURRENCY_NAME}`} />
            <StatCard label="Max boost cap" value={`20 ${CURRENCY_NAME}`} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to glow?</h2>
          <p className="text-muted-foreground mb-8">
            Join {APP_NAME} today with 5 {CURRENCY_NAME} welcome bonus. No credit card required.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup">Create Account</Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
      <div className="mb-4 p-3 rounded-full bg-timt-light/50 dark:bg-timt/10">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border bg-card">
      <p className="text-2xl font-bold text-timt">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
