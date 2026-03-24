# Timely — Architecture Documentation

## Overview

Timely is built as a monolithic Next.js 14 application using the App Router. It follows a layered architecture with clear separation between the presentation, API, business logic, and data layers.

## Architecture Layers

```
┌─────────────────────────────────────────────────┐
│                  Browser (Client)                │
│  React Components, SWR fetching, Auth Context   │
└────────────────────┬────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────┐
│              Next.js App Router                  │
│  Server Components + API Route Handlers          │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│             Business Logic Layer                 │
│  src/server/ — economy, posts, engagement,      │
│  feed, wallet, notifications                     │
└────────────────────┬────────────────────────────┘
                     │ Prisma Client
┌────────────────────▼────────────────────────────┐
│              PostgreSQL Database                 │
│  All persistent data, atomic transactions        │
└─────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│           Firebase Services (Optional)           │
│  Auth, Storage, FCM, Remote Config, Analytics   │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Demo Mode
All Firebase features degrade gracefully. When `NEXT_PUBLIC_DEMO_MODE=true` or Firebase config is absent, the app uses:
- Cookie-based sessions with demo user IDs
- Pre-seeded database data
- Console logging instead of analytics
- No-op push notifications

### 2. Server-Side Business Logic
All financial operations (TIMT debits/credits) are handled server-side in atomic Prisma transactions. This prevents double-spending and race conditions.

### 3. Feed Ordering Algorithm
The feed is ordered by:
1. `expiresAt` ascending — urgency first
2. `boostPriority` descending — paid amplification
3. `er60` descending — recent engagement
4. `createdAt` descending — freshness

### 4. Token Economy
```
Publication: -1 TIMT (atomic debit)
Like received: +0.05 TIMT (capped by daily limit)
Comment received: +0.20 TIMT (capped by daily limit)
ER60 bonus: +0.50 TIMT (once per 6h per post if ER60 ≥ 10)
Boost: -N TIMT (atomic debit, boosts post priority)
Daily earn cap: 3 TIMT per user
```

## Data Models

### Core Entities
- **User** — Account, auth, moderation state
- **Profile** — Extended user info, counts
- **Wallet** — TIMT balance, daily earn tracking
- **TokenTransaction** — Full audit trail of all token movements

### Post Lifecycle
- **Post** — Content, status (draft/live/expired/archived), expiresAt
- **PostStats** — Denormalized counters for performance
- **PostExtension** — Records each extension for decay calculation
- **PostBoost** — Time-boxed boost contributions

### Social Graph
- **Like** — Unique per user per post
- **Comment** — Validated, rate-limited
- **Follow** — Directed social graph

### Infrastructure
- **Notification** — In-app + push notification queue
- **FcmToken** — Device tokens for push
- **AuthProvider** — Multi-provider auth linking
- **AuditLog** — Admin audit trail
- **ModerationAction** — Strike/suspend/warn history

## API Route Structure

```
/api/
  health              GET - Health check
  auth/
    session           POST - Create session (Firebase or demo)
                      DELETE - Sign out
    me                GET - Current user
  posts               GET - Feed, POST - Create
  posts/[id]          GET - Post detail
  posts/[id]/extend   POST - Extend lifetime
  posts/[id]/boost    POST - Boost post
  likes               POST - Like/unlike
  comments            POST - Add comment
  wallet              GET - Balance + transactions
  notifications       GET - List, PATCH - Mark read
  reports             POST - Submit report
  profile/[username]  GET - Public profile
  profile             PATCH - Update own profile
  admin/
    expire            POST - Manually expire posts (dev/cron)
```

## Firebase Integration

All Firebase features use graceful fallback wrappers:
- `isFirebaseConfigured()` — Check if Firebase is available
- `safeTrackEvent()` — Analytics with fallback to no-op
- `safeSendPush()` — FCM with fallback to no-op
- `safeUploadFile()` — Storage with fallback to null
- `getRemoteConfigValueOrDefault()` — Remote Config with local defaults

## Session Management

**Demo Mode**: Simple cookie `timely_session=demo_user_alice`. Server reads the user ID directly.

**Firebase Mode**: Firebase session cookie created from ID token. Server verifies with Firebase Admin SDK.

## Performance Considerations

1. **Denormalized counters**: `PostStats` table avoids expensive COUNT queries on likes/comments
2. **Feed pagination**: Cursor-based pagination with compound indexes
3. **Boost priority**: Stored on `Post` table, recalculated on each boost event
4. **SWR caching**: Client-side cache with 5-second deduplication
5. **Prisma connection pooling**: Singleton pattern for connection reuse in serverless
