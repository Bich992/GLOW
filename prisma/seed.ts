import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.postBoost.deleteMany();
  await prisma.postExtension.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.tokenTransaction.deleteMany();
  await prisma.postStats.deleteMany();
  await prisma.post.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.user.deleteMany();

  // Create demo users
  const now = new Date();
  const alice = await prisma.user.create({
    data: {
      id: 'user_alice',
      email: 'alice@demo.timely.app',
      username: 'alice',
      displayName: 'Alice Demo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      bio: 'Early adopter of Timely. I love sharing fleeting thoughts!',
      isDemoUser: true,
      emailVerified: true,
      profile: {
        create: {
          postCount: 3,
          followerCount: 2,
          followingCount: 1,
        },
      },
      wallet: {
        create: {
          balance: 15.5,
          earnedToday: 0.75,
          earnResetAt: now,
        },
      },
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'user_bob',
      email: 'bob@demo.timely.app',
      username: 'bob',
      displayName: 'Bob Demo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      bio: 'Building things that matter. TIMT hodler.',
      isDemoUser: true,
      emailVerified: true,
      profile: {
        create: {
          postCount: 3,
          followerCount: 1,
          followingCount: 2,
        },
      },
      wallet: {
        create: {
          balance: 8.25,
          earnedToday: 0.2,
          earnResetAt: now,
        },
      },
    },
  });

  const charlie = await prisma.user.create({
    data: {
      id: 'user_charlie',
      email: 'charlie@demo.timely.app',
      username: 'charlie',
      displayName: 'Charlie Demo',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
      bio: 'Just here for the vibes. 🌟',
      isDemoUser: true,
      emailVerified: true,
      profile: {
        create: {
          postCount: 2,
          followerCount: 3,
          followingCount: 1,
        },
      },
      wallet: {
        create: {
          balance: 22.0,
          earnedToday: 1.1,
          earnResetAt: now,
        },
      },
    },
  });

  // Create follows
  await prisma.follow.createMany({
    data: [
      { followerId: alice.id, followingId: bob.id },
      { followerId: alice.id, followingId: charlie.id },
      { followerId: bob.id, followingId: alice.id },
      { followerId: charlie.id, followingId: alice.id },
      { followerId: charlie.id, followingId: bob.id },
    ],
  });

  // Create seed transactions
  const aliceWallet = await prisma.wallet.findUnique({ where: { userId: alice.id } });
  const bobWallet = await prisma.wallet.findUnique({ where: { userId: bob.id } });
  const charlieWallet = await prisma.wallet.findUnique({ where: { userId: charlie.id } });

  if (!aliceWallet || !bobWallet || !charlieWallet) throw new Error('Wallets not found');

  await prisma.tokenTransaction.createMany({
    data: [
      {
        userId: alice.id,
        walletId: aliceWallet.id,
        type: 'faucet',
        amount: 10,
        balanceAfter: 10,
        description: 'Welcome bonus',
        createdAt: new Date(Date.now() - 7 * 86400000),
      },
      {
        userId: alice.id,
        walletId: aliceWallet.id,
        type: 'earn',
        amount: 5.5,
        balanceAfter: 15.5,
        description: 'Engagement rewards',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        userId: bob.id,
        walletId: bobWallet.id,
        type: 'faucet',
        amount: 10,
        balanceAfter: 10,
        description: 'Welcome bonus',
        createdAt: new Date(Date.now() - 5 * 86400000),
      },
      {
        userId: bob.id,
        walletId: bobWallet.id,
        type: 'spend',
        amount: -1,
        balanceAfter: 9,
        description: 'Post published',
        createdAt: new Date(Date.now() - 3 * 86400000),
      },
      {
        userId: bob.id,
        walletId: bobWallet.id,
        type: 'earn',
        amount: 0.25,
        balanceAfter: 9.25,
        description: 'Like rewards',
        createdAt: new Date(Date.now() - 1 * 86400000),
      },
      {
        userId: charlie.id,
        walletId: charlieWallet.id,
        type: 'faucet',
        amount: 20,
        balanceAfter: 20,
        description: 'Welcome bonus',
        createdAt: new Date(Date.now() - 10 * 86400000),
      },
      {
        userId: charlie.id,
        walletId: charlieWallet.id,
        type: 'earn',
        amount: 2,
        balanceAfter: 22,
        description: 'Engagement rewards',
        createdAt: new Date(Date.now() - 1 * 86400000),
      },
    ],
  });

  // Create demo posts in various states
  const postBase = new Date();

  // Post 1: Live, expiring soon (alice)
  const post1 = await prisma.post.create({
    data: {
      id: 'post_1',
      authorId: alice.id,
      content: 'Just discovered the most amazing coffee shop downtown! The barista makes art with foam ☕ This moment deserves to be shared before it disappears.',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 2 * 3600000),
      expiresAt: new Date(postBase.getTime() + 45 * 60000), // 45 min left
      boostPriority: 1.4,
      stats: {
        create: {
          likeCount: 5,
          commentCount: 2,
          extensionCount: 1,
          boostCount: 1,
          totalBoostTimt: 2.0,
          er60: 8.0,
        },
      },
    },
  });

  // Post 2: Live, boosted (bob)
  const post2 = await prisma.post.create({
    data: {
      id: 'post_2',
      authorId: bob.id,
      content: 'Hot take: asynchronous work is actually better for deep thinking. Change my mind. Reply with your hottest takes on remote work culture.',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 1 * 3600000),
      expiresAt: new Date(postBase.getTime() + 3 * 3600000 + 15 * 60000),
      boostPriority: 1.8,
      stats: {
        create: {
          likeCount: 12,
          commentCount: 5,
          extensionCount: 0,
          boostCount: 3,
          totalBoostTimt: 6.5,
          er60: 17.0,
        },
      },
    },
  });

  // Post 3: Live, fresh (charlie)
  const post3 = await prisma.post.create({
    data: {
      id: 'post_3',
      authorId: charlie.id,
      content: 'The sky tonight is absolutely otherworldly. Shades of purple and gold I\'ve never seen before. Nature is the original artist.',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 20 * 60000),
      expiresAt: new Date(postBase.getTime() + 5 * 3600000 + 40 * 60000),
      boostPriority: 1.0,
      stats: {
        create: {
          likeCount: 3,
          commentCount: 1,
          extensionCount: 0,
          boostCount: 0,
          totalBoostTimt: 0,
          er60: 4.0,
        },
      },
    },
  });

  // Post 4: Live, extended (alice)
  const post4 = await prisma.post.create({
    data: {
      id: 'post_4',
      authorId: alice.id,
      content: 'Reminder that small acts of kindness compound. Held the door for a stranger, they smiled, and I bet that smile spread further. Be the ripple.',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 4 * 3600000),
      expiresAt: new Date(postBase.getTime() + 2 * 3600000 + 30 * 60000),
      boostPriority: 1.2,
      stats: {
        create: {
          likeCount: 8,
          commentCount: 3,
          extensionCount: 2,
          boostCount: 1,
          totalBoostTimt: 1.5,
          er60: 5.0,
        },
      },
    },
  });

  // Post 5: Live (bob)
  const post5 = await prisma.post.create({
    data: {
      id: 'post_5',
      authorId: bob.id,
      content: 'Reading about compound interest at 23 vs 33 should be mandatory in school. The 10-year difference is staggering. Financial literacy matters.',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 30 * 60000),
      expiresAt: new Date(postBase.getTime() + 4 * 3600000 + 30 * 60000),
      boostPriority: 1.0,
      stats: {
        create: {
          likeCount: 7,
          commentCount: 2,
          extensionCount: 0,
          boostCount: 0,
          totalBoostTimt: 0,
          er60: 9.0,
        },
      },
    },
  });

  // Post 6: Expiring very soon (charlie)
  const post6 = await prisma.post.create({
    data: {
      id: 'post_6',
      authorId: charlie.id,
      content: 'This post is about to expire! Someone save it with an extension 😅 Just testing the countdown timer feature. Tick tock...',
      status: 'live',
      publishedAt: new Date(postBase.getTime() - 5.5 * 3600000),
      expiresAt: new Date(postBase.getTime() + 8 * 60000), // 8 min left
      boostPriority: 1.0,
      stats: {
        create: {
          likeCount: 2,
          commentCount: 0,
          extensionCount: 0,
          boostCount: 0,
          totalBoostTimt: 0,
          er60: 2.0,
        },
      },
    },
  });

  // Post 7: Expired (alice)
  await prisma.post.create({
    data: {
      id: 'post_7',
      authorId: alice.id,
      content: 'This was a great morning thought that has now lived its full life. Thanks for reading while it lasted!',
      status: 'expired',
      publishedAt: new Date(postBase.getTime() - 8 * 3600000),
      expiresAt: new Date(postBase.getTime() - 2 * 3600000),
      boostPriority: 0,
      stats: {
        create: {
          likeCount: 15,
          commentCount: 4,
          extensionCount: 1,
          boostCount: 2,
          totalBoostTimt: 3.0,
          er60: 0,
        },
      },
    },
  });

  // Post 8: Draft (bob)
  await prisma.post.create({
    data: {
      id: 'post_8',
      authorId: bob.id,
      content: 'Draft: Working on some thoughts about the future of social media. Not ready to publish yet...',
      status: 'draft',
      boostPriority: 0,
      stats: {
        create: {},
      },
    },
  });

  // Create likes
  await prisma.like.createMany({
    data: [
      { postId: post1.id, userId: bob.id, createdAt: new Date(Date.now() - 30 * 60000) },
      { postId: post1.id, userId: charlie.id, createdAt: new Date(Date.now() - 25 * 60000) },
      { postId: post2.id, userId: alice.id, createdAt: new Date(Date.now() - 45 * 60000) },
      { postId: post2.id, userId: charlie.id, createdAt: new Date(Date.now() - 40 * 60000) },
      { postId: post3.id, userId: alice.id, createdAt: new Date(Date.now() - 10 * 60000) },
      { postId: post4.id, userId: bob.id, createdAt: new Date(Date.now() - 60 * 60000) },
      { postId: post4.id, userId: charlie.id, createdAt: new Date(Date.now() - 55 * 60000) },
      { postId: post5.id, userId: alice.id, createdAt: new Date(Date.now() - 20 * 60000) },
      { postId: post5.id, userId: charlie.id, createdAt: new Date(Date.now() - 15 * 60000) },
    ],
  });

  // Create comments
  await prisma.comment.createMany({
    data: [
      {
        postId: post1.id,
        userId: bob.id,
        content: 'Which coffee shop? I need this in my life immediately!',
        createdAt: new Date(Date.now() - 28 * 60000),
      },
      {
        postId: post1.id,
        userId: charlie.id,
        content: 'Foam art is such a nice touch. The attention to detail makes all the difference.',
        createdAt: new Date(Date.now() - 22 * 60000),
      },
      {
        postId: post2.id,
        userId: alice.id,
        content: 'Fully agree. Deep work requires uninterrupted focus, async makes that possible.',
        createdAt: new Date(Date.now() - 50 * 60000),
      },
      {
        postId: post2.id,
        userId: charlie.id,
        content: 'Counter point: some creativity requires real-time collaboration. Balance is key!',
        createdAt: new Date(Date.now() - 35 * 60000),
      },
      {
        postId: post4.id,
        userId: bob.id,
        content: 'This really made me smile. Going to try this today.',
        createdAt: new Date(Date.now() - 90 * 60000),
      },
      {
        postId: post5.id,
        userId: alice.id,
        content: 'The rule of 72 is what finally made it click for me. Powerful stuff!',
        createdAt: new Date(Date.now() - 25 * 60000),
      },
    ],
  });

  // Create extensions
  await prisma.postExtension.createMany({
    data: [
      {
        postId: post1.id,
        userId: bob.id,
        deltaSeconds: 3600,
        extensionIndex: 0,
        createdAt: new Date(Date.now() - 1 * 3600000),
      },
      {
        postId: post4.id,
        userId: charlie.id,
        deltaSeconds: 3600,
        extensionIndex: 0,
        createdAt: new Date(Date.now() - 3 * 3600000),
      },
      {
        postId: post4.id,
        userId: alice.id,
        deltaSeconds: 2880,
        extensionIndex: 0,
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
    ],
  });

  // Create boosts
  const boostExpiry = new Date(Date.now() + 90 * 60000);
  await prisma.postBoost.createMany({
    data: [
      {
        postId: post1.id,
        userId: charlie.id,
        amount: 2.0,
        expiresAt: boostExpiry,
        createdAt: new Date(Date.now() - 60 * 60000),
      },
      {
        postId: post2.id,
        userId: alice.id,
        amount: 3.0,
        expiresAt: boostExpiry,
        createdAt: new Date(Date.now() - 45 * 60000),
      },
      {
        postId: post2.id,
        userId: charlie.id,
        amount: 2.0,
        expiresAt: boostExpiry,
        createdAt: new Date(Date.now() - 40 * 60000),
      },
      {
        postId: post2.id,
        userId: alice.id,
        amount: 1.5,
        expiresAt: boostExpiry,
        createdAt: new Date(Date.now() - 20 * 60000),
      },
      {
        postId: post4.id,
        userId: bob.id,
        amount: 1.5,
        expiresAt: boostExpiry,
        createdAt: new Date(Date.now() - 2 * 3600000),
      },
    ],
  });

  // Create notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alice.id,
        type: 'like',
        title: 'New like',
        body: 'bob liked your post about the coffee shop.',
        postId: post1.id,
        actorId: bob.id,
        read: false,
        createdAt: new Date(Date.now() - 30 * 60000),
      },
      {
        userId: alice.id,
        type: 'comment',
        title: 'New comment',
        body: 'bob commented: "Which coffee shop? I need this in my life immediately!"',
        postId: post1.id,
        actorId: bob.id,
        read: false,
        createdAt: new Date(Date.now() - 28 * 60000),
      },
      {
        userId: alice.id,
        type: 'boost',
        title: 'Post boosted!',
        body: 'charlie boosted your coffee shop post with 2 TIMT!',
        postId: post1.id,
        actorId: charlie.id,
        read: true,
        createdAt: new Date(Date.now() - 60 * 60000),
      },
      {
        userId: alice.id,
        type: 'follow',
        title: 'New follower',
        body: 'charlie started following you.',
        actorId: charlie.id,
        read: true,
        createdAt: new Date(Date.now() - 5 * 3600000),
      },
      {
        userId: alice.id,
        type: 'expire_soon',
        title: 'Post expiring soon',
        body: 'Your coffee shop post expires in less than 1 hour!',
        postId: post1.id,
        read: false,
        createdAt: new Date(Date.now() - 5 * 60000),
      },
      {
        userId: bob.id,
        type: 'like',
        title: 'New like',
        body: 'alice liked your post about async work.',
        postId: post2.id,
        actorId: alice.id,
        read: false,
        createdAt: new Date(Date.now() - 45 * 60000),
      },
      {
        userId: bob.id,
        type: 'comment',
        title: 'New comment',
        body: 'alice commented on your async work post.',
        postId: post2.id,
        actorId: alice.id,
        read: true,
        createdAt: new Date(Date.now() - 50 * 60000),
      },
      {
        userId: charlie.id,
        type: 'follow',
        title: 'New follower',
        body: 'alice started following you.',
        actorId: alice.id,
        read: false,
        createdAt: new Date(Date.now() - 4 * 3600000),
      },
    ],
  });

  console.log('Seed complete!');
  console.log(`Created users: alice, bob, charlie`);
  console.log(`Created 8 posts (6 live, 1 expired, 1 draft)`);
  console.log(`Created likes, comments, extensions, boosts, notifications`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
