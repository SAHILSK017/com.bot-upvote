import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  MapPinnedIcon,
  MessageSquareIcon,
  RocketIcon,
  SearchIcon,
  XIcon,
  PaletteIcon,
  ZapIcon,
  SparklesIcon,
  LayersIcon,
  RadioIcon,
  CalendarIcon,
} from 'lucide-react';
import { postsApi } from '@/api/posts.api';
import { getErrorMessage } from '@/api/client';
import { RoadmapSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { VoteButton } from '@/components/VoteButton';
import { PostDetailModal } from '@/components/PostDetailModal';
import { useVote } from '@/hooks/useVote';
import { formatDate } from '@/utils/format';
import {
  ROADMAP_STATUSES,
  STATUS_LABELS,
  POST_CATEGORIES,
  type Post,
  type PostCategory,
  type PostStatus,
} from '@/types';
import { cn } from '@/lib/utils';

const columnConfig: Record<
  PostStatus,
  {
    title: string;
    description: string;
    borderTop: string;
    border: string;
    bgHeader: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
    icon: typeof RocketIcon;
    iconBg: string;
    iconColor: string;
    accentBar: string;
  }
> = {
  under_review: {
    title: 'Under Review',
    description: 'Community ideas being evaluated by the product team',
    borderTop: 'bg-amber-400',
    border: 'border-amber-200/60',
    bgHeader: 'bg-amber-50/50',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeText: 'text-amber-800',
    dot: 'bg-amber-400',
    icon: RadioIcon,
    iconBg: 'bg-amber-100/80',
    iconColor: 'text-amber-700',
    accentBar: 'bg-amber-400',
  },
  planned: {
    title: 'Planned',
    description: 'Approved features queued and scheduled for upcoming development',
    borderTop: 'bg-teal-700',
    border: 'border-teal-200/80',
    bgHeader: 'bg-teal-50/40',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
    badgeText: 'text-teal-800',
    dot: 'bg-teal-700',
    icon: MapPinnedIcon,
    iconBg: 'bg-teal-100/80',
    iconColor: 'text-teal-800',
    accentBar: 'bg-teal-700',
  },
  in_progress: {
    title: 'In Progress',
    description: 'Features currently being actively coded, designed, and tested',
    borderTop: 'bg-cyan-500',
    border: 'border-cyan-200/80',
    bgHeader: 'bg-cyan-50/40',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    badgeText: 'text-cyan-800',
    dot: 'bg-cyan-500 animate-pulse',
    icon: RocketIcon,
    iconBg: 'bg-cyan-100/80',
    iconColor: 'text-cyan-700',
    accentBar: 'bg-cyan-500',
  },
  completed: {
    title: 'Completed',
    description: 'Shipped to production and live for all users in latest release',
    borderTop: 'bg-emerald-500',
    border: 'border-emerald-200/70',
    bgHeader: 'bg-emerald-50/40',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeText: 'text-emerald-800',
    dot: 'bg-emerald-500',
    icon: CheckCircle2Icon,
    iconBg: 'bg-emerald-100/80',
    iconColor: 'text-emerald-700',
    accentBar: 'bg-emerald-500',
  },
};

const categoryConfig: Record<
  PostCategory,
  { bg: string; text: string; ring: string; icon: typeof SparklesIcon }
> = {
  'UI/UX': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-indigo-600/20',
    icon: PaletteIcon,
  },
  Integrations: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-sky-600/20',
    icon: ZapIcon,
  },
  Performance: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    ring: 'ring-purple-600/20',
    icon: SparklesIcon,
  },
  General: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    ring: 'ring-slate-600/20',
    icon: LayersIcon,
  },
};

/**
 * Modern SaaS Kanban roadmap with live telemetry, interactive cards, and direct detail inspection.
 */
export default function RoadmapPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { toggleVote, isPending } = useVote();

  const load = useCallback(async (showSkeleton: boolean) => {
    if (showSkeleton) setIsLoading(true);
    try {
      const results = await Promise.all(
        ROADMAP_STATUSES.map((status) =>
          postsApi.list({ status, sort: 'upvoted', limit: 50 })
        )
      );
      setPosts(results.flatMap((r) => r.data.data.posts));
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    function onFocus() {
      void load(false);
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') void load(false);
    }
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const updatePostLocally = useCallback((updated: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedPost && selectedPost.id === updated.id) {
      setSelectedPost(updated);
    }
  }, [selectedPost]);

  function handleVote(post: Post) {
    void toggleVote(post, {
      onOptimistic: updatePostLocally,
      onRollback: updatePostLocally,
      onSuccess: updatePostLocally,
    });
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [posts, categoryFilter, searchQuery]);

  const byStatus = (status: PostStatus) => filteredPosts.filter((p) => p.status === status);

  const plannedCount = byStatus('planned').length;
  const inProgressCount = byStatus('in_progress').length;
  const completedCount = byStatus('completed').length;
  const totalTracked = filteredPosts.length;
  const deliveryRate = totalTracked > 0 ? Math.round((completedCount / totalTracked) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <section className="relative overflow-hidden rounded-xl border border-border bg-white p-4 sm:p-5 shadow-2xs">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary mb-2">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span>Engineering Execution Board</span>
              <span className="text-primary/40">•</span>
              <span className="text-slate-600 font-normal">Sprint Velocity</span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Public Roadmap & Velocity
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Explore what we've committed to build, live development sprint progress, and recently shipped innovations.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden xl:block w-px h-16 bg-border/80 self-center" />

            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-border bg-slate-50/60 divide-x divide-border overflow-hidden shadow-2xs">
              <div className="flex flex-col justify-between p-3 min-w-[105px] bg-slate-50/40">
                <div className="flex items-center justify-between text-slate-700 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Total Ideas</span>
                  <LayersIcon className="size-4 text-slate-500" />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-black tracking-tight text-slate-900 font-mono">
                    {totalTracked}
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">In pipeline</p>
                </div>
              </div>

              <div className="flex flex-col justify-between p-3 min-w-[105px] bg-teal-50/30">
                <div className="flex items-center justify-between text-teal-800 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Planned</span>
                  <MapPinnedIcon className="size-4 text-teal-700" />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-black tracking-tight text-teal-800 font-mono">
                    {plannedCount}
                  </span>
                  <p className="text-xs text-teal-700/80 mt-0.5 font-medium">Queued build</p>
                </div>
              </div>

              <div className="flex flex-col justify-between p-3 min-w-[105px] bg-cyan-50/30">
                <div className="flex items-center justify-between text-cyan-800 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800">In Flight</span>
                  <span className="flex size-2 rounded-full bg-cyan-500 animate-pulse" />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-black tracking-tight text-cyan-800 font-mono">
                    {inProgressCount}
                  </span>
                  <p className="text-xs text-cyan-700/80 mt-0.5 font-medium">Active sprint</p>
                </div>
              </div>

              <div className="flex flex-col justify-between p-3 min-w-[105px] bg-emerald-50/20">
                <div className="flex items-center justify-between text-emerald-700 gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Shipped</span>
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                </div>
                <div className="mt-1.5">
                  <span className="text-xl font-black tracking-tight text-emerald-700 font-mono">
                    {completedCount}
                  </span>
                  <p className="text-xs text-emerald-700/80 mt-0.5 font-medium">{deliveryRate}% rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {totalTracked > 0 && (
          <div className="mt-4 pt-3.5 border-t border-border/70 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-3 sm:gap-4 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-teal-700" />
                  <span className="font-semibold text-slate-800">Planned: {plannedCount}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  <span className="font-semibold text-slate-800">In Progress: {inProgressCount}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-slate-800">Shipped: {completedCount}</span>
                </span>
              </div>
              <span className="font-mono font-bold text-slate-800 text-xs">
                {deliveryRate}% Completed
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
              <div
                style={{ width: `${(plannedCount / totalTracked) * 100}%` }}
                className="h-full bg-teal-700 transition-all duration-500"
                title={`Planned: ${plannedCount}`}
              />
              <div
                style={{ width: `${(inProgressCount / totalTracked) * 100}%` }}
                className="h-full bg-cyan-500 transition-all duration-500"
                title={`In Progress: ${inProgressCount}`}
              />
              <div
                style={{ width: `${(completedCount / totalTracked) * 100}%` }}
                className="h-full bg-emerald-500 transition-all duration-500"
                title={`Shipped: ${completedCount}`}
              />
            </div>
          </div>
        )}
      </section>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-border/80 to-transparent" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white py-2 px-3 sm:px-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {['all', ...POST_CATEGORIES].map((cat) => {
            const isSelected = categoryFilter === cat;
            const CatIcon =
              cat === 'all'
                ? LayersIcon
                : categoryConfig[cat as PostCategory]?.icon || LayersIcon;
            const count =
              cat === 'all'
                ? posts.length
                : posts.filter((p) => p.category === cat).length;

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer select-none',
                  isSelected
                    ? 'btn-primary-glow shadow-xs text-white'
                    : 'border border-border bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <CatIcon className={cn('size-3.5', isSelected ? 'text-white' : 'text-slate-600')} />
                <span>{cat === 'all' ? 'All Domains' : cat}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold',
                    isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="Search roadmap features..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 rounded-md border-border bg-slate-50/80 pl-8 pr-7 text-xs shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-r from-transparent via-border/80 to-transparent" />

      {isLoading ? (
        <RoadmapSkeleton />
      ) : error ? (
        <EmptyState title="Could not load roadmap" description={error} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {ROADMAP_STATUSES.map((status) => {
            const column = byStatus(status);
            const config = columnConfig[status];
            const ColIcon = config.icon;

            return (
              <section
                key={status}
                className={cn(
                  'relative flex flex-col rounded-xl border bg-slate-50/60 p-3.5 sm:p-4 shadow-2xs overflow-hidden',
                  config.border
                )}
              >
                <div className={cn('absolute top-0 inset-x-0 h-1', config.borderTop)} />

                <div className="flex items-start justify-between border-b border-border/80 pb-3 pt-0.5">
                  <div className="flex items-center gap-2">
                    <div className={cn('flex size-7 items-center justify-center rounded-md shadow-2xs', config.iconBg, config.iconColor)}>
                      <ColIcon className="size-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">
                          {config.title}
                        </h2>
                        <span className={cn('size-2 rounded-full', config.dot)} />
                      </div>
                      <p className="text-xs text-slate-600 leading-tight mt-0.5 line-clamp-1 font-normal">
                        {config.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs font-mono font-bold shadow-2xs',
                      config.badgeBg
                    )}
                  >
                    {column.length}
                  </span>
                </div>

                {column.length === 0 ? (
                  <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-white/70 p-4 text-center text-xs text-slate-500 my-2">
                    <ColIcon className={cn('size-6 mb-1.5 opacity-40', config.iconColor)} />
                    <p className="font-bold text-slate-800 text-xs">No features in {STATUS_LABELS[status].toLowerCase()}</p>
                    <p className="mt-0.5 text-xs text-slate-500 font-normal">Features move here as they progress.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 pt-3">
                    {column.map((post, idx) => {
                      const cat = categoryConfig[post.category] || categoryConfig.General;
                      const CatIcon = cat.icon;
                      const authorInitial = post.author?.name?.[0]?.toUpperCase() || 'U';

                      const cleanDescription = (post.description || '')
                        .replace(/^#{1,6}\s+/gm, '')
                        .replace(/[*_~`]/g, '')
                        .trim();

                      return (
                        <article
                          key={post.id}
                          onClick={() => setSelectedPost(post)}
                          className={cn(
                            'group relative flex flex-col justify-between rounded-xl border border-slate-300/90 bg-white p-4 shadow-2xs cursor-pointer select-none',
                            'transition-all duration-200 hover:border-primary hover:ring-2 hover:ring-primary/20 hover:shadow-md hover:-translate-y-0.5'
                          )}
                          style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset',
                                cat.bg,
                                cat.text,
                                cat.ring
                              )}
                            >
                              <CatIcon className="size-3 opacity-90" />
                              {post.category}
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <span className="size-5 rounded-full bg-slate-100 text-[10px] text-slate-700 border border-border flex items-center justify-center font-bold">
                                {authorInitial}
                              </span>
                              <span className="truncate max-w-[100px]">{post.author?.name || 'Community'}</span>
                            </span>
                          </div>

                          <h3 className="text-sm font-bold tracking-tight text-slate-900 leading-snug">
                            <span className="group-hover:text-primary transition-colors inline-flex items-center gap-1">
                              <span>{post.title}</span>
                              <ArrowRightIcon className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                            </span>
                          </h3>

                          <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-2 font-normal">
                            {cleanDescription || 'No description provided.'}
                          </p>

                          <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5">
                            <VoteButton
                              post={post}
                              onToggle={handleVote}
                              disabled={isPending(post.id)}
                              variant="horizontal"
                              className="px-2.5 py-1 text-xs"
                            />

                            <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                              <span className="inline-flex items-center gap-1 hover:text-primary transition-colors">
                                <MessageSquareIcon className="size-3.5 opacity-70" />
                                <span>{post.commentCount}</span>
                              </span>
                              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500">
                                <CalendarIcon className="size-3" />
                                <span>{formatDate(post.createdAt)}</span>
                              </span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <PostDetailModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onToggleVote={handleVote}
        voteDisabled={selectedPost ? isPending(selectedPost.id) : false}
        onPostUpdated={(updatedPost) => {
          updatePostLocally(updatedPost);
        }}
      />
    </div>
  );
}
