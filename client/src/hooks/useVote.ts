import { useCallback, useRef, useState } from 'react';
import { postsApi } from '@/api/posts.api';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { toastManager } from '@/components/ui/toast';
import type { Post } from '@/types';

type VoteHandlers = {
  onOptimistic?: (post: Post) => void;
  onRollback?: (post: Post) => void;
  onSuccess?: (post: Post) => void;
};

/**
 * Optimistic upvote/unvote with guest intercept, in-flight lock, and rollback.
 */
export function useVote() {
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const pendingRef = useRef<Set<string>>(new Set());
  const [, bump] = useState(0);

  const isPending = useCallback((postId: string) => pendingRef.current.has(postId), []);

  const toggleVote = useCallback(
    async (post: Post, handlers: VoteHandlers = {}) => {
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }

      if (pendingRef.current.has(post.id)) return;

      const previous = { ...post };
      const next: Post = post.hasVoted
        ? { ...post, hasVoted: false, voteCount: Math.max(0, post.voteCount - 1) }
        : { ...post, hasVoted: true, voteCount: post.voteCount + 1 };

      handlers.onOptimistic?.(next);
      pendingRef.current.add(post.id);
      bump((n) => n + 1);

      try {
        const res = post.hasVoted
          ? await postsApi.unvote(post.id)
          : await postsApi.vote(post.id);
        handlers.onSuccess?.(res.data.data.post);
      } catch (err) {
        handlers.onRollback?.(previous);
        toastManager.add({
          title: 'Vote failed',
          description: getErrorMessage(err),
          type: 'error',
        });
      } finally {
        pendingRef.current.delete(post.id);
        bump((n) => n + 1);
      }
    },
    [isAuthenticated, openAuthModal]
  );

  return { toggleVote, isPending };
}
