# Timely — Dev & Test Checklist

## Initial Setup Checklist

- [ ] `npm install` completes without errors
- [ ] `docker compose up -d` starts PostgreSQL on port 5432
- [ ] `.env.local` copied from `.env.example`
- [ ] `npx prisma migrate dev` runs all migrations
- [ ] `npm run db:seed` seeds demo users and posts
- [ ] `npm run dev` starts on http://localhost:3000

## Health Check

- [ ] `GET /api/health` returns 200 with `status: "ok"`
- [ ] Database connection shows `status: "ok"` in health response

## Authentication

### Demo Mode
- [ ] Landing page loads without errors
- [ ] Login page shows demo user buttons (alice, bob, charlie)
- [ ] Clicking "Alice" demo button creates session cookie
- [ ] After demo login, user is redirected to `/feed`
- [ ] TopNav shows alice's avatar and TIMT balance
- [ ] BottomNav shows on mobile viewport
- [ ] Sign out clears session and redirects to landing

### Firebase Mode (if configured)
- [ ] Google OAuth sign-in works
- [ ] Email/password sign-in works
- [ ] New Firebase user auto-creates DB record with 10 TIMT welcome bonus
- [ ] Session persists across page refresh

## Feed

- [ ] `/feed` loads and shows live posts
- [ ] Posts are sorted: urgent expiry first, then boost priority, then ER60, then freshness
- [ ] Each post shows countdown timer
- [ ] Posts expiring in < 30 minutes show orange timer
- [ ] Posts expiring in < 5 minutes show red flashing timer
- [ ] Boosted posts show "Boosted" badge
- [ ] Switching "Following" tab shows only followed users' posts
- [ ] Refresh button reloads feed

## Post Creation

- [ ] `/posts/new` redirects to login if unauthenticated
- [ ] PostComposer shows character count (max 500)
- [ ] Cost of 1 TIMT displayed
- [ ] User with < 1 TIMT sees insufficient balance warning
- [ ] Successfully publishing deducts 1 TIMT from wallet
- [ ] Post appears in feed after creation
- [ ] New post has 6-hour expiry countdown

## Post Detail

- [ ] `/posts/[id]` loads post with all comments
- [ ] Comment form requires min 10 characters
- [ ] Posting a comment increments comment count
- [ ] Posting a comment on someone else's post awards them 0.20 TIMT
- [ ] Expired posts show "Expired" badge and no comment form

## Extend Post

- [ ] "Extend" button opens ExtendModal
- [ ] Modal shows correct delta time (decay applied)
- [ ] First extension adds 3600 seconds (1 hour)
- [ ] Second extension adds 2880 seconds (48 min)
- [ ] After 5 extensions by same user, button returns error
- [ ] Daily +12h cap enforced per post

## Boost Post

- [ ] "Boost" button opens BoostModal
- [ ] Preset amounts (0.5, 1, 2, 5) TIMT shown
- [ ] Custom amount input works (min 0.5, max 20)
- [ ] Insufficient balance prevents boost
- [ ] Successful boost deducts TIMT from wallet
- [ ] Post shows "Boosted" badge after boost
- [ ] Boost cap of 20 TIMT enforced
- [ ] Boost notification sent to post author

## Likes

- [ ] Heart button on PostCard toggles like/unlike
- [ ] Like count updates optimistically
- [ ] Liking another user's post awards them 0.05 TIMT
- [ ] Self-liking does not award tokens
- [ ] Like reverts on API error

## Wallet

- [ ] `/wallet` shows TIMT balance
- [ ] Daily earn progress bar shown
- [ ] Transaction history listed with icons
- [ ] Positive amounts green, negative red
- [ ] Earn guide shows all reward rates

## Notifications

- [ ] `/notifications` shows all notifications
- [ ] Unread notifications have blue dot indicator
- [ ] Clicking notification marks it read
- [ ] "Mark all read" button works
- [ ] Unread count badge in TopNav

## Profile

- [ ] `/profile/[username]` loads for alice/bob/charlie
- [ ] Avatar, bio, follow counts displayed
- [ ] User's live and expired posts shown
- [ ] Follow/unfollow button visible for other users
- [ ] Own profile shows "Edit Profile" button

## Settings

- [ ] `/settings` shows profile edit form
- [ ] Theme switcher works (light/dark/system)
- [ ] Save profile updates display name
- [ ] Sign out button works

## Admin

- [ ] `POST /api/admin/expire` manually expires due posts
- [ ] Response shows `expiredCount`

## Error States

- [ ] 404 post shows error message with back button
- [ ] Invalid post ID returns 404
- [ ] API errors show toast notifications
- [ ] Network errors handled gracefully

## Token Economy Invariants

- [ ] Total TIMT in system only increases via faucet/earn
- [ ] Publishing always costs exactly 1 TIMT
- [ ] Daily earn cap of 3 TIMT enforced
- [ ] Wallet balance never goes negative
- [ ] All token movements recorded in TokenTransaction

## Performance

- [ ] Feed loads in < 2 seconds
- [ ] Post detail loads in < 1 second
- [ ] Health endpoint responds in < 500ms
- [ ] No N+1 queries (check Prisma logs)

## Dark Mode

- [ ] All pages render correctly in dark mode
- [ ] TIMT chip/badge readable in dark mode
- [ ] CountdownTimer warnings visible in dark mode
- [ ] Theme persists across navigation

## Mobile

- [ ] BottomNav visible on mobile
- [ ] TopNav hides BottomNav items on desktop
- [ ] PostCard readable on mobile viewport
- [ ] Modals size correctly on mobile
