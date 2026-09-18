import { api } from './client';
import type { ApiSuccess, Pagination, Post, PostCategory, PostSort, PostStatus } from '@/types';

export type ListPostsParams = {
  sort?: PostSort;
  category?: PostCategory | '';
  status?: PostStatus | '';
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * Posts API helpers.
 */
export const postsApi = {
  list: (params?: ListPostsParams) =>
    api.get<ApiSuccess<{ posts: Post[]; pagination: Pagination }>>('/posts', {
      params: Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined)
      ),
    }),

  getById: (id: string) => api.get<ApiSuccess<{ post: Post }>>(`/posts/${id}`),

  create: (body: { title: string; description: string; category: PostCategory }) =>
    api.post<ApiSuccess<{ post: Post }>>('/posts', body),

  vote: (id: string) => api.post<ApiSuccess<{ post: Post }>>(`/posts/${id}/vote`, {}),

  unvote: (id: string) => api.delete<ApiSuccess<{ post: Post }>>(`/posts/${id}/vote`, { data: {} }),
};
