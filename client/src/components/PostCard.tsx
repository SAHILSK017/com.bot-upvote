import {
  ArrowRightIcon,
  CalendarIcon,
  MessageSquareIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { VoteButton } from '@/components/VoteButton';
import { formatDate } from '@/utils/format';
import { categoryConfig } from '@/utils/categoryConfig';
import type { Post } from '@/types';
import { cn } from '@/lib/utils';

type PostCardProps = {
  post: Post;
  onToggleVote: (post: Post) => void;
  index?: number;
  voteDisabled?: boolean;
  onClick?: (post: Post) => void;
};



export function PostCard({ post, onToggleVote, index = 0, voteDisabled, onClick }: PostCardProps) {
  const cat = categoryConfig[post.category] || categoryConfig.General;
  const CatIcon = cat.icon;
  const authorInitial = post.author?.name?.[0]?.toUpperCase() || 'U';

  const cleanDescription = (post.description || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~`]/g, '')
    .trim();

  return (
    <article
      onClick={() => onClick?.(post)}
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 border-slate-200 bg-white p-5 shadow-xs cursor-pointer select-none',
        'transition-all duration-200 hover:border-primary hover:ring-2 hover:ring-primary/15 hover:shadow-md hover:-translate-y-0.5'
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-4 sm:gap-4.5">
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'shrink-0 rounded-xl transition-all duration-200',
            post.hasVoted
              ? 'ring-2 ring-primary/25 shadow-[0_0_12px_rgb(var(--primary)/0.15)]'
              : ''
          )}
        >
          <VoteButton
            post={post}
            onToggle={onToggleVote}
            disabled={voteDisabled}
            data-tour={index === 0 ? 'upvote' : undefined}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={post.status} size="sm" />
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border',
                cat.bg,
                cat.text,
                'border-current/20'
              )}
            >
              <CatIcon className="size-3 opacity-90" />
              {post.category}
            </span>
          </div>

          <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg leading-snug">
            <span
              className="group-hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              <span>{post.title}</span>
              <ArrowRightIcon className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
            </span>
          </h3>

          <p className="mt-2 line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground font-normal">
            {cleanDescription || 'No description provided.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="size-5 rounded-full bg-slate-100 text-[10px] text-slate-700 border border-border flex items-center justify-center font-bold">
              {authorInitial}
            </span>
            {post.author?.name || 'Anonymous'}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <CalendarIcon className="size-3 opacity-70" />
            {formatDate(post.createdAt)}
          </span>
        </div>

        <div
          data-tour={index === 0 ? 'comments' : undefined}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-border transition-colors group-hover:bg-primary/5 group-hover:text-primary group-hover:ring-primary/20"
        >
          <MessageSquareIcon className="size-3.5 opacity-70" />
          <span>
            {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </span>
        </div>
      </div>
    </article>
  );
}
