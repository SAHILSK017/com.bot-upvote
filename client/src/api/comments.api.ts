import { api } from './client';
import type { ApiSuccess, Comment } from '@/types';

/**
 * Comments API helpers.
 */
export const commentsApi = {
  listForPost: (postId: string) =>
    api.get<ApiSuccess<{ comments: Comment[] }>>(`/posts/${postId}/comments`),

  create: (postId: string, body: { content: string; parentComment?: string | null }) =>
    api.post<ApiSuccess<{ comment: Comment }>>(`/posts/${postId}/comments`, body),

  update: (id: string, body: { content: string }) =>
    api.patch<ApiSuccess<{ comment: Comment }>>(`/comments/${id}`, body),

  remove: (id: string) => api.delete<ApiSuccess<{ deleted: number }>>(`/comments/${id}`),
};
