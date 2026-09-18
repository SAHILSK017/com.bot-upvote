import { useCallback, useEffect, useState } from 'react';
import { postsApi, type ListPostsParams } from '@/api/posts.api';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import type { Pagination, Post } from '@/types';

/**
 * Loads the feature-request feed with filters.
 * Waits for auth bootstrap so `hasVoted` reflects the logged-in user.
 */
export function usePosts(params: ListPostsParams) {
  const { isLoading: authLoading, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await postsApi.list(params);
      setPosts(res.data.data.posts);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (authLoading) return;
    void reload();
  }, [reload, authLoading, user?.id]);

  const updatePost = useCallback((next: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }, []);

  return { posts, pagination, isLoading: isLoading || authLoading, error, reload, updatePost, setPosts };
}
