import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { postsApi } from '@/api/posts.api';
import { commentsApi } from '@/api/comments.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardPanel } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { VoteButton } from '@/components/VoteButton';
import { Markdown } from '@/components/Markdown';
import { DetailSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { useVote } from '@/hooks/useVote';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { toastManager } from '@/components/ui/toast';
import { formatDate } from '@/utils/format';
import type { Comment, Post } from '@/types';

/**
 * Feature request detail with threaded comments (create / edit / delete).
 */
export default function PostDetailPage() {
  const { id = '' } = useParams();
  const { isAuthenticated, user, isAdmin, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { toggleVote, isPending } = useVote();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsApi.getById(id),
          commentsApi.listForPost(id),
        ]);
        if (cancelled) return;
        setPost(postRes.data.data.post);
        setComments(commentsRes.data.data.comments);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user?.id]);

  async function reloadComments() {
    const commentsRes = await commentsApi.listForPost(id);
    setComments(commentsRes.data.data.comments);
  }

  function canModerate(comment: Comment) {
    return user?.id === comment.author.id || isAdmin;
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await commentsApi.create(id, {
        content,
        parentComment: replyTo,
      });
      setContent('');
      setReplyTo(null);
      toastManager.add({ title: 'Comment posted', type: 'success' });
      await reloadComments();
      if (post) setPost({ ...post, commentCount: post.commentCount + 1 });
    } catch (err) {
      toastManager.add({
        title: 'Could not post comment',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(commentId: string) {
    if (savingEdit || !editContent.trim()) return;
    setSavingEdit(true);
    try {
      await commentsApi.update(commentId, { content: editContent.trim() });
      toastManager.add({ title: 'Comment updated', type: 'success' });
      setEditingId(null);
      setEditContent('');
      await reloadComments();
    } catch (err) {
      toastManager.add({
        title: 'Update failed',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeComment(commentId: string) {
    try {
      const res = await commentsApi.remove(commentId);
      toastManager.add({ title: 'Comment deleted', type: 'success' });
      await reloadComments();
      if (post) {
        setPost({
          ...post,
          commentCount: Math.max(0, post.commentCount - res.data.data.deleted),
        });
      }
    } catch (err) {
      toastManager.add({
        title: 'Delete failed',
        description: getErrorMessage(err),
        type: 'error',
      });
    }
  }

  function renderCommentBody(comment: Comment) {
    if (editingId === comment.id) {
      return (
        <div className="flex flex-col gap-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            maxLength={5000}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={savingEdit}
              onClick={() => void saveEdit(comment.id)}
            >
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={savingEdit}
              onClick={() => {
                setEditingId(null);
                setEditContent('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    return <Markdown content={comment.content} />;
  }

  function renderActions(comment: Comment, isTopLevel: boolean) {
    return (
      <div className="flex flex-wrap gap-1">
        {isTopLevel && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              if (!isAuthenticated) openAuthModal('login');
              else setReplyTo(comment.id);
            }}
          >
            Reply
          </Button>
        )}
        {canModerate(comment) && (
          <>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setEditingId(comment.id);
                setEditContent(comment.content);
              }}
            >
              Edit
            </Button>
            <Button size="xs" variant="ghost" onClick={() => void removeComment(comment.id)}>
              Delete
            </Button>
          </>
        )}
      </div>
    );
  }

  if (authLoading || isLoading) return <DetailSkeleton />;
  if (error || !post) {
    return (
      <EmptyState title="Post not found" description={error || 'This request may have been removed.'} />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <Link
        to="/feed"
        className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
      >
        <span>← Back to Feature Feed</span>
      </Link>

      {/* Main Feature Request Card */}
      <div className="glass rounded-2xl border border-white/10 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <VoteButton
            post={post}
            disabled={isPending(post.id)}
            onToggle={(p) =>
              void toggleVote(p, {
                onOptimistic: setPost,
                onRollback: setPost,
                onSuccess: setPost,
              })
            }
          />
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={post.status} />
              <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-xs">
                {post.category}
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {post.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-tr from-teal-700 to-cyan-500 text-[10px] font-bold text-white">
                  {post.author.name?.[0]?.toUpperCase() || 'U'}
                </span>
                {post.author.name}
              </span>
              <span>•</span>
              <span>{formatDate(post.createdAt)}</span>
              <span>•</span>
              <span>{post.commentCount} comments</span>
            </div>
            <div className="mt-6 border-t border-white/8 pt-5 text-sm leading-relaxed text-foreground/90">
              <Markdown content={post.description} />
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Discussion</h2>
        <form onSubmit={submitComment} className="flex flex-col gap-2">
          {replyTo && (
            <p className="text-muted-foreground text-xs">
              Replying to a comment{' '}
              <button type="button" className="underline" onClick={() => setReplyTo(null)}>
                Cancel
              </button>
            </p>
          )}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isAuthenticated ? 'Write a comment (markdown ok)…' : 'Log in to comment…'}
            rows={3}
            required
            maxLength={5000}
            disabled={submitting}
          />
          <div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post comment'}
            </Button>
          </div>
        </form>

        {comments.length === 0 ? (
          <EmptyState title="No comments yet" description="Start the conversation." />
        ) : (
          <div className="flex flex-col gap-3">
            {comments.map((comment) => (
              <Card key={comment.id}>
                <CardPanel className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">
                      {comment.author.name}{' '}
                      <span className="text-muted-foreground font-normal">
                        · {formatDate(comment.createdAt)}
                        {comment.editedAt ? ' · edited' : ''}
                      </span>
                    </p>
                    {renderActions(comment, true)}
                  </div>
                  {renderCommentBody(comment)}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="border-muted ml-4 flex flex-col gap-3 border-l pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">
                              {reply.author.name}{' '}
                              <span className="text-muted-foreground font-normal">
                                · {formatDate(reply.createdAt)}
                                {reply.editedAt ? ' · edited' : ''}
                              </span>
                            </p>
                            {renderActions(reply, false)}
                          </div>
                          {renderCommentBody(reply)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardPanel>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
