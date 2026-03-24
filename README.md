# Timely — Ephemeral Social Posts with Token Economy

Timely is a full-stack social platform where every post lives for just 6 hours. Users earn TIMT tokens through engagement and can spend them to boost posts or extend their lifetime.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)
- npm or yarn

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL via Docker
docker compose up -d

# 3. Copy environment variables
cp .env.example .env.local

# 4. Run database migrations
npx prisma migrate dev

# 5. Seed with demo data
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo Mode

By default, the app runs in demo mode (`NEXT_PUBLIC_DEMO_MODE=true`). This means:
- No Firebase credentials needed
- Three demo users available: **alice**, **bob**, **charlie**
- Pre-seeded posts, likes, comments, boosts, and notifications
- Cookie-based session in dev

Click any demo user button on the login page to get started immediately.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL + Prisma ORM |
| Auth | Firebase Auth + demo fallback |
| Storage | Firebase Storage |
| Push | Firebase Cloud Messaging |
| Config | Firebase Remote Config |
| State | SWR |
| Forms | React Hook Form + Zod |

## Business Rules

### Post Lifecycle
- **Cost**: 1 TIMT to publish
- **Initial lifetime**: 6 hours
- **States**: draft → live → expired | archived

### Extensions (Free)
- delta_t = round(3600 × 0.8^s), minimum 300s
- Max 5 extensions per user per post per day
- Max +12 hours total per post per day

### Boosts (Costs TIMT)
- Minimum: 0.5 TIMT
- Cap: 20 TIMT per 120-minute window
- Effect: 1 TIMT = +20% priority for 20 minutes
- Max effect: +200%

### Earning TIMT
- Like received: +0.05 TIMT
- Comment received: +0.20 TIMT (min 10 chars)
- ER60 ≥ 10 (at most once per 6h per post): +0.50 TIMT
- **Daily cap**: 3 TIMT per user

## Project Structure

```
src/
  app/           # Next.js App Router pages + API routes
  components/    # Shared UI components
  lib/           # Utilities, db client, auth helpers
  server/        # Server-only business logic
  features/      # Feature modules (firebase, etc.)
  types/         # Shared TypeScript types
prisma/
  schema.prisma  # Full database schema
  seed.ts        # Demo data seeder
tests/           # Unit and API tests
docs/            # Architecture docs
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed demo data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database
npm test             # Run tests
```

## Firebase Setup (Optional)

To enable full Firebase features:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password + Google)
3. Enable Firestore Storage
4. Enable Cloud Messaging
5. Enable Remote Config
6. Enable App Check

Copy your config to `.env.local` and set `NEXT_PUBLIC_DEMO_MODE=false`.

## License

MIT
