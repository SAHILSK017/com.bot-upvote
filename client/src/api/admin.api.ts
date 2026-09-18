import { api } from './client';
import type { ApiSuccess, Pagination, Post, PostCategory, PostStatus } from '@/types';
import type { ListPostsParams } from './posts.api';

/**
 * Admin API helpers.
 */
export const adminApi = {
  listPosts: (params?: ListPostsParams) =>
    api.get<ApiSuccess<{ posts: Post[]; pagination: Pagination }>>('/admin/posts', {
      params: Object.fromEntries(
        Object.entries(params || {}).filter(([, v]) => v !== '' && v !== undefined)
      ),
    }),

  updateStatus: (id: string, status: PostStatus) =>
    api.patch<
      ApiSuccess<{ post: Post; outOfSequence: boolean; previousStatus: PostStatus }>
    >(`/admin/posts/${id}/status`, { status }),

  updatePost: (id: string, body: { title?: string; description?: string; category?: PostCategory }) =>
    api.patch<ApiSuccess<{ post: Post }>>(`/admin/posts/${id}`, body),

  deletePost: (id: string) =>
    api.delete<ApiSuccess<{ deleted: boolean }>>(`/admin/posts/${id}`),
};

