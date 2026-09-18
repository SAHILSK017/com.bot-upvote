import { ChevronUpIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Post } from '@/types';

type VoteButtonProps = {
  post: Post;
  onToggle: (post: Post) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'vertical' | 'horizontal';
  'data-tour'?: string;
};

export function VoteButton({
  post,
  onToggle,
  disabled,
  className,
  variant = 'vertical',
  'data-tour': dataTour,
}: VoteButtonProps) {
  const isVoted = Boolean(post.hasVoted);

  if (variant === 'horizontal') {
    return (
      <button
        type="button"
        data-tour={dataTour}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle(post);
        }}
        aria-pressed={isVoted}
        aria-label={isVoted ? 'Remove upvote' : 'Upvote'}
        className={cn(
          'group/vote inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer select-none',
          isVoted
            ? 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/30'
            : 'border-border bg-slate-50 text-slate-700 hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-xs',
          'active:scale-95 disabled:opacity-50',
          className
        )}
      >
        <ChevronUpIcon
          className={cn(
            'size-4 transition-transform duration-200',
            isVoted ? 'scale-110 text-primary stroke-[2.5]' : 'group-hover/vote:-translate-y-0.5 text-slate-500 group-hover/vote:text-primary'
          )}
        />
        <span className="font-mono tabular-nums">{post.voteCount}</span>
        <span className="font-semibold">{isVoted ? 'Voted' : 'Upvote'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      data-tour={dataTour}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(post);
      }}
      aria-pressed={isVoted}
      aria-label={isVoted ? 'Remove upvote' : 'Upvote this request'}
      className={cn(
        'group/vote relative flex flex-col items-center justify-center min-w-[62px] px-2.5 py-3 rounded-xl border-2 transition-all duration-200 cursor-pointer select-none shrink-0',
        isVoted
          ? [
              'border-primary bg-gradient-to-b from-primary/15 to-primary/5 text-primary',
              'shadow-[0_0_0_3px_rgb(var(--primary)/0.15),0_2px_8px_rgb(var(--primary)/0.25)]',
              'ring-0',
            ]
          : [
              'border-slate-200 bg-white text-slate-600',
              'shadow-xs hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-[0_0_0_2px_rgb(var(--primary)/0.1)]',
              'hover:-translate-y-0.5',
            ],
        'active:scale-95 disabled:opacity-50',
        className
      )}
    >
      {isVoted && (
        <span className="absolute inset-0 rounded-[10px] animate-pulse bg-primary/8 pointer-events-none" />
      )}

      <ChevronUpIcon
        className={cn(
          'size-5 transition-all duration-200 relative z-10',
          isVoted
            ? 'scale-125 text-primary stroke-[2.5] drop-shadow-[0_0_4px_rgb(var(--primary)/0.5)]'
            : 'group-hover/vote:-translate-y-0.5 text-slate-500 group-hover/vote:text-primary'
        )}
      />
      <span
        className={cn(
          'text-sm font-extrabold tabular-nums font-mono mt-0.5 leading-none relative z-10',
          isVoted ? 'text-primary text-base' : 'text-foreground group-hover/vote:text-primary'
        )}
      >
        {post.voteCount}
      </span>
      <span
        className={cn(
          'text-[9px] font-bold uppercase tracking-wider mt-1 leading-none relative z-10',
          isVoted ? 'text-primary font-extrabold' : 'text-slate-500 group-hover/vote:text-primary'
        )}
      >
        {isVoted ? 'Voted' : 'Upvote'}
      </span>
    </button>
  );
}
