import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarIcon,
  MessageSquareIcon,
  ArrowUpRightIcon,
  SendIcon,
  Loader2Icon,
  Trash2Icon,
  CornerDownRightIcon,
  PencilIcon,
  ShieldCheckIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import { VoteButton } from '@/components/VoteButton';
import { Markdown } from '@/components/Markdown';
import { postsApi } from '@/api/posts.api';
import { commentsApi } from '@/api/comments.api';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { toastManager } from '@/components/ui/toast';
import { formatDate } from '@/utils/format';
import { categoryConfig } from '@/utils/categoryConfig';
import { POST_STATUSES, STATUS_LABELS } from '@/types';
import type { Comment, Post, PostStatus } from '@/types';
import { cn } from '@/lib/utils';


type PostDetailModalProps = {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleVote: (post: Post) => void;
  onPostUpdated?: (updatedPost: Post) => void;
  onStatusChange?: (post: Post, status: PostStatus) => Promise<void>;
  voteDisabled?: boolean;
};

/** Avatar initial circle with optional admin ring */
function Avatar({
  name,
  isAdminUser,
  size = 'sm',
}: {
  name?: string;
  isAdminUser?: boolean;
  size?: 'sm' | 'md';
}) {
  const initial = name?.[0]?.toUpperCase() || 'U';
  const sz = size === 'md' ? 'size-8 text-xs' : 'size-6 text-[10px]';
  return (
    <span
      className={cn(
        sz,
        'rounded-full flex items-center justify-center font-bold shrink-0 select-none',
        isAdminUser
          ? 'bg-primary/10 text-primary border-2 border-primary/30'
          : 'bg-slate-100 text-slate-700 border border-border'
      )}
    >
      {initial}
    </span>
  );
}

export function PostDetailModal({
  post: initialPost,
  isOpen,
  onClose,
  onToggleVote,
  onPostUpdated,
  onStatusChange,
  voteDisabled,
}: PostDetailModalProps) {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [currentPost, setCurrentPost] = useState<Post | null>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);

  // Inline edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync initial post whenever opened
  useEffect(() => {
    setCurrentPost(initialPost);
  }, [initialPost]);

  // Fetch latest post & comments when modal opens
  useEffect(() => {
    if (!isOpen || !initialPost?.id) return;
    let isCancelled = false;

    async function loadData() {
      setIsLoadingComments(true);
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsApi.getById(initialPost!.id),
          commentsApi.listForPost(initialPost!.id),
        ]);
        if (!isCancelled) {
          const freshPost = postRes.data.data.post;
          setCurrentPost(freshPost);
          setComments(commentsRes.data.data.comments);
          onPostUpdated?.(freshPost);
        }
      } catch (err) {
        console.error('Failed to load post details in modal', err);
      } finally {
        if (!isCancelled) setIsLoadingComments(false);
      }
    }

    void loadData();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, initialPost?.id]);

  if (!currentPost) return null;

  const cat = categoryConfig[currentPost.category] || categoryConfig.General;
  const CatIcon = cat.icon;
  const authorInitial = currentPost.author?.name?.[0]?.toUpperCase() || 'U';

  async function handleVoteClick(p: Post) {
    onToggleVote(p);
    const updated = {
      ...currentPost!,
      hasVoted: !currentPost!.hasVoted,
      voteCount: currentPost!.hasVoted ? currentPost!.voteCount - 1 : currentPost!.voteCount + 1,
    };
    setCurrentPost(updated);
    onPostUpdated?.(updated);
  }

  async function handleStatusChange(nextStatus: PostStatus) {
    if (!currentPost || isChangingStatus || !onStatusChange) return;
    setIsChangingStatus(true);
    try {
      await onStatusChange(currentPost, nextStatus);
      // Optimistically reflect new status in modal
      const updated = { ...currentPost, status: nextStatus };
      setCurrentPost(updated);
      onPostUpdated?.(updated);
    } catch {
      // Error is handled by parent
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function reloadComments() {
    const commentsRes = await commentsApi.listForPost(currentPost!.id);
    setComments(commentsRes.data.data.comments);
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (!currentPost || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      await commentsApi.create(currentPost.id, {
        content: newComment.trim(),
        parentComment: replyToId,
      });
      setNewComment('');
      setReplyToId(null);
      toastManager.add({ title: 'Comment posted', type: 'success' });
      await reloadComments();
      const updated: Post = {
        ...currentPost,
        commentCount: currentPost.commentCount + 1,
      };
      setCurrentPost(updated);
      onPostUpdated?.(updated);
    } catch (err) {
      toastManager.add({
        title: 'Could not post comment',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentPost || deletingId) return;
    setDeletingId(commentId);
    setConfirmDeleteId(null);
    try {
      const res = await commentsApi.remove(commentId);
      toastManager.add({ title: 'Comment deleted', type: 'success' });
      await reloadComments();
      const deleted = (res.data.data as { deleted: number }).deleted ?? 1;
      const updated: Post = {
        ...currentPost,
        commentCount: Math.max(0, currentPost.commentCount - deleted),
      };
      setCurrentPost(updated);
      onPostUpdated?.(updated);
    } catch (err) {
      toastManager.add({
        title: 'Failed to delete comment',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  }

  function startEditComment(comment: Comment) {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingCommentId(null);
    setEditContent('');
  }

  async function handleSaveEdit(commentId: string) {
    if (!editContent.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await commentsApi.update(commentId, { content: editContent.trim() });
      toastManager.add({ title: 'Comment updated', type: 'success' });
      cancelEdit();
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

  function canModerate(comment: Comment) {
    return user?.id === comment.author?.id || isAdmin;
  }

  /** Renders a single comment card (top-level or reply) */
  function renderComment(comment: Comment, isReply = false) {
    const isCommentAuthorAdmin = false; // We don't have role info in comment.author, use name heuristic
    const isOwner = user?.id === comment.author?.id;
    const canMod = canModerate(comment);
    const isEditing = editingCommentId === comment.id;
    const isDeleting = deletingId === comment.id;
    const isConfirmingDelete = confirmDeleteId === comment.id;

    return (
      <div
        key={comment.id}
        className={cn(
          'group relative rounded-xl border bg-white transition-all duration-150',
          isReply
            ? 'border-primary/20 bg-primary/[0.02] ml-7 shadow-none'
            : 'border-border shadow-2xs hover:border-slate-300 hover:shadow-xs',
          isDeleting && 'opacity-50 pointer-events-none'
        )}
      >
        {/* Left accent stripe for replies */}
        {isReply && (
          <div className="absolute -left-4 top-4 bottom-4 w-0.5 rounded-full bg-primary/20" />
        )}

        <div className="p-4">
          {/* Comment Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                name={comment.author?.name}
                isAdminUser={isCommentAuthorAdmin}
                size={isReply ? 'sm' : 'md'}
              />
              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">
                    {comment.author?.name || 'Anonymous'}
                  </span>
                  {isOwner && !isAdmin && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                      You
                    </span>
                  )}
                  {isAdmin && isOwner && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase tracking-wider">
                      <ShieldCheckIcon className="size-2.5" />
                      Admin
                    </span>
                  )}
                  {comment.editedAt && (
                    <span className="text-[10px] text-muted-foreground/60 italic">edited</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <CalendarIcon className="size-2.5 opacity-60" />
                  {formatDate(comment.createdAt)}
                </span>
              </div>
            </div>

            {/* Action buttons — always visible for admins, visible on hover for others */}
            {canMod && !isEditing && (
              <div
                className={cn(
                  'flex items-center gap-1 shrink-0 transition-opacity',
                  isAdmin ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                )}
              >
                {/* Reply button — only on top-level */}
                {!isReply && !isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isAuthenticated) openAuthModal('login');
                      else {
                        setReplyToId(comment.id);
                        setConfirmDeleteId(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors cursor-pointer"
                  >
                    <CornerDownRightIcon className="size-3" />
                    Reply
                  </button>
                )}
                {/* Edit */}
                <button
                  type="button"
                  onClick={() => startEditComment(comment)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-primary transition-colors cursor-pointer"
                  title="Edit comment"
                >
                  <PencilIcon className="size-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                {/* Delete with confirm */}
                {isConfirmingDelete ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-red-600">Delete?</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteComment(comment.id)}
                      className="inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      title="Confirm delete"
                    >
                      <CheckIcon className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(comment.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2Icon className="size-3" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            )}

            {/* Reply button for non-owners/non-admins (always visible on top-level) */}
            {!isReply && !canMod && (
              <button
                type="button"
                onClick={() => {
                  if (!isAuthenticated) openAuthModal('login');
                  else {
                    setReplyToId(comment.id);
                    setConfirmDeleteId(null);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 hover:text-primary transition-all cursor-pointer shrink-0"
              >
                <CornerDownRightIcon className="size-3" />
                Reply
              </button>
            )}
          </div>

          {/* Comment Body */}
          {isEditing ? (
            <div className="flex flex-col gap-2.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                maxLength={5000}
                className="rounded-lg border-primary/30 bg-primary/5 text-sm focus-visible:ring-1 focus-visible:ring-primary resize-none"
                disabled={savingEdit}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={savingEdit || !editContent.trim()}
                  onClick={() => void handleSaveEdit(comment.id)}
                  className="h-7 text-xs px-3 gap-1.5"
                >
                  {savingEdit ? (
                    <><Loader2Icon className="size-3 animate-spin" /> Saving…</>
                  ) : (
                    <><CheckIcon className="size-3" /> Save</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingEdit}
                  onClick={cancelEdit}
                  className="h-7 text-xs px-3 gap-1.5"
                >
                  <XIcon className="size-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-foreground leading-relaxed pl-[34px]">
              <Markdown content={comment.content} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl p-0">
        {/* Modal Header Bar */}
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-3.5 flex flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={currentPost.status} size="sm" />
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border',
                cat.bg,
                cat.text,
                'border-current/20'
              )}
            >
              <CatIcon className="size-3 opacity-90" />
              {currentPost.category}
            </span>
            <span className="font-mono text-xs text-muted-foreground/80">
              #{currentPost.id.slice(-6)}
            </span>
          </div>

          {/* Right side: admin status changer + open full page */}
          <div className="flex items-center gap-2 shrink-0 mr-5">
            {/* Admin Status Change Dropdown */}
            {isAdmin && onStatusChange && (
              <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-primary shrink-0" />
                <Select
                  value={currentPost.status}
                  disabled={isChangingStatus}
                  onValueChange={(val) => void handleStatusChange(val as PostStatus)}
                >
                  <SelectTrigger
                    className={cn(
                      'h-8 w-36 rounded-lg border-2 text-xs font-bold shadow-xs focus:ring-1 focus:ring-primary transition-all',
                      currentPost.status === 'under_review' && 'border-amber-300 bg-amber-50 text-amber-800',
                      currentPost.status === 'planned' && 'border-teal-300 bg-teal-50 text-teal-900',
                      currentPost.status === 'in_progress' && 'border-cyan-300 bg-cyan-50 text-cyan-800',
                      currentPost.status === 'completed' && 'border-emerald-300 bg-emerald-50 text-emerald-700',
                      isChangingStatus && 'opacity-60'
                    )}
                  >
                    <SelectValue />
                    {isChangingStatus && <Loader2Icon className="size-3 animate-spin ml-auto" />}
                  </SelectTrigger>
                  <SelectPopup>
                    {POST_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs font-semibold py-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'size-2 rounded-full',
                              s === 'under_review' && 'bg-amber-500',
                              s === 'planned' && 'bg-teal-700',
                              s === 'in_progress' && 'bg-cyan-500',
                              s === 'completed' && 'bg-emerald-500'
                            )}
                          />
                          {STATUS_LABELS[s]}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </div>
            )}

            {/* Open Full Page link */}
            <Link
              to={`/posts/${currentPost.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition-colors"
            >
              <span className="hidden sm:inline">Open Full Page</span>
              <ArrowUpRightIcon className="size-3.5" />
            </Link>
          </div>
        </DialogHeader>

        {/* Scrollable Modal Content */}
        <DialogPanel className="flex flex-col gap-6 overflow-y-auto p-6 flex-1 min-h-0">
          {/* Post Heading & Upvote Row */}
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Highlighted Vote Button */}
            <div
              className={cn(
                'shrink-0 rounded-xl transition-all duration-200',
                currentPost.hasVoted
                  ? 'ring-2 ring-primary/25 shadow-[0_0_16px_rgb(var(--primary)/0.2)]'
                  : ''
              )}
            >
              <VoteButton
                post={currentPost}
                onToggle={handleVoteClick}
                disabled={voteDisabled}
                className="mt-0"
              />
            </div>

            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground leading-snug">
                {currentPost.title}
              </DialogTitle>

              {/* Author & Timestamp */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <span className="size-5 rounded-full bg-slate-100 text-[10px] text-slate-700 border border-border flex items-center justify-center font-bold">
                    {authorInitial}
                  </span>
                  {currentPost.author?.name || 'Anonymous'}
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarIcon className="size-3.5 opacity-70" />
                  {formatDate(currentPost.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Full Markdown Description */}
          <div className="rounded-xl border border-border/80 bg-slate-50/50 p-5 sm:p-6 text-sm text-foreground leading-relaxed">
            <Markdown content={currentPost.description} />
          </div>

          {/* Discussion / Comments Section */}
          <div className="border-t border-border pt-6 flex flex-col gap-5">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                <MessageSquareIcon className="size-4 text-primary" />
                <span>Discussion</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {comments.length}
                </span>
              </h4>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/8 px-2.5 py-1 rounded-full">
                  <ShieldCheckIcon className="size-3" />
                  Admin View
                </span>
              )}
            </div>

            {/* Leave a Comment Box */}
            <form onSubmit={handleCommentSubmit} className="flex flex-col gap-2.5">
              {replyToId && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-1.5 text-xs text-primary font-semibold border border-primary/20">
                  <span className="flex items-center gap-1.5">
                    <CornerDownRightIcon className="size-3.5" />
                    Replying to a comment
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyToId(null)}
                    className="underline hover:opacity-80 cursor-pointer"
                  >
                    Cancel reply
                  </button>
                </div>
              )}

              <Textarea
                placeholder={
                  isAuthenticated
                    ? 'Write a comment or share thoughts on this feature…'
                    : 'Sign in to join the conversation and leave a comment…'
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="rounded-xl border-border bg-slate-50/70 p-3 text-sm focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary resize-none"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Markdown supported
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingComment || !newComment.trim()}
                  className="btn-primary-glow inline-flex items-center gap-1.5 rounded-lg text-xs font-bold px-4 shadow-xs"
                >
                  {submittingComment ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>Posting…</span>
                    </>
                  ) : (
                    <>
                      <SendIcon className="size-3.5" />
                      <span>Comment</span>
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin mr-2 text-primary" />
                <span>Loading discussion…</span>
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-8 text-center text-xs text-muted-foreground">
                No comments yet. Be the first to share your thoughts on this proposal!
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-2">
                    {/* Top-level comment */}
                    {renderComment(comment, false)}

                    {/* Threaded Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="flex flex-col gap-2 ml-4 relative">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-primary/15 rounded-full" />
                        {comment.replies.map((reply) => renderComment(reply, true))}
                      </div>
                    )}

                    {/* Reply button below top-level (for admin) */}
                    {isAdmin && !editingCommentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyToId(comment.id);
                          setConfirmDeleteId(null);
                        }}
                        className="self-start ml-10 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-primary transition-colors cursor-pointer"
                      >
                        <CornerDownRightIcon className="size-3" />
                        Reply
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
