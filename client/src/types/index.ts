/** Shared domain types matching the API. */

export type UserRole = 'user' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
};

export type PostCategory = 'UI/UX' | 'Integrations' | 'Performance' | 'General';

export type PostStatus = 'under_review' | 'planned' | 'in_progress' | 'completed';

export type PostSort = 'upvoted' | 'newest' | 'discussed';

export type PostAuthor = {
  id: string;
  name: string;
  email: string;
};

export type Post = {
  id: string;
  title: string;
  description: string;
  category: PostCategory;
  status: PostStatus;
  author: PostAuthor;
  voteCount: number;
  commentCount: number;
  hasVoted?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Comment = {
  id: string;
  post: string;
  author: PostAuthor;
  content: string;
  parentComment: string | null;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
};

export type ApiError = {
  success: false;
  message: string;
  errors?: { path: string; message: string }[];
};

export const POST_CATEGORIES: PostCategory[] = [
  'UI/UX',
  'Integrations',
  'Performance',
  'General',
];

export const POST_STATUSES: PostStatus[] = [
  'under_review',
  'planned',
  'in_progress',
  'completed',
];

export const ROADMAP_STATUSES: PostStatus[] = ['planned', 'in_progress', 'completed'];

export const STATUS_LABELS: Record<PostStatus, string> = {
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
};
