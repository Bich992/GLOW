export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface PostStats {
  likeCount: number;
  commentCount: number;
  extensionCount: number;
  boostCount: number;
  totalBoostTimt: number;
  er60: number;
}

export interface FeedPost {
  id: string;
  content: string;
  imageUrl: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  status: string;
  publishedAt: string | null;
  expiresAt: string | null;
  born_at?: string | null;
  is_expired?: boolean;
  boostPriority: number;
  createdAt: string;
  author: UserSummary;
  stats: PostStats | null;
  _likedByCurrentUser?: boolean;
}

export interface PostDetail extends FeedPost {
  comments: CommentWithAuthor[];
}

export interface CommentWithAuthor {
  id: string;
  content: string;
  createdAt: string;
  user: UserSummary;
}

export interface WalletData {
  id: string;
  balance: number;
  earnedToday: number;
  earnResetAt: string;
}

export interface TransactionData {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
  post: { id: string; content: string } | null;
}

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  postId: string | null;
  actorId: string | null;
  read: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isDemo: boolean;
  wallet?: WalletData;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export type FeedFilter = 'all' | 'following';

export type PostFormData = {
  content: string;
  imageUrl?: string;
};

export type CommentFormData = {
  content: string;
};

export type BoostFormData = {
  amount: number;
};

export type ReportFormData = {
  reason: string;
  description?: string;
};

export type SignupFormData = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  birthDate: string;
};

export type LoginFormData = {
  email: string;
  password: string;
};
