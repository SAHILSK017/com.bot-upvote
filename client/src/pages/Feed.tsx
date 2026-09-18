import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightIcon,
  ArrowUpDownIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  FlameIcon,
  LayersIcon,
  MapPinnedIcon,
  PaletteIcon,
  RocketIcon,
  SearchIcon,
  SparklesIcon,
  TrendingUpIcon,
  XIcon,
  ZapIcon,
  PlayIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PostCard } from '@/components/PostCard';
import { CreatePostDialog } from '@/components/CreatePostDialog';
import { PostDetailModal } from '@/components/PostDetailModal';
import { FeedSkeleton } from '@/components/Skeletons';
import { EmptyState } from '@/components/EmptyState';
import { usePosts } from '@/hooks/usePosts';
import { useVote } from '@/hooks/useVote';
import { useOnboarding } from '@/context/OnboardingContext';
import { POST_CATEGORIES, POST_STATUSES, STATUS_LABELS, type Post, type PostSort } from '@/types';
import { cn } from '@/lib/utils';

const categoryTabs: { label: string; value: string; icon: typeof LayersIcon }[] = [
  { label: 'All Ideas', value: '', icon: LayersIcon },
  { label: 'UI/UX', value: 'UI/UX', icon: PaletteIcon },
  { label: 'Integrations', value: 'Integrations', icon: ZapIcon },
  { label: 'Performance', value: 'Performance', icon: SparklesIcon },
  { label: 'General', value: 'General', icon: LayersIcon },
];

export default function FeedPage() {
  const [sort, setSort] = useState<PostSort>('newest');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { startTour } = useOnboarding();

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = useMemo(
    () => ({
      sort,
      category: category as '' | undefined,
      status: status as '' | undefined,
      search: search || undefined,
      page,
      limit: 10,
    }),
    [sort, category, status, search, page]
  );

  const { posts, pagination, isLoading, error, updatePost, setPosts } = usePosts(params);
  const { toggleVote, isPending } = useVote();

  function handleVote(post: Post) {
    void toggleVote(post, {
      onOptimistic: updatePost,
      onRollback: updatePost,
      onSuccess: updatePost,
    });
  }

  // Status counts for overview radar
  const radarCounts = useMemo(() => {
    const counts = {
      under_review: 0,
      planned: 0,
      in_progress: 0,
      completed: 0,
    };
    posts.forEach((p) => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [posts]);

  const trendingPosts = useMemo(() => {
    return [...posts].sort((a, b) => b.voteCount - a.voteCount).slice(0, 3);
  }, [posts]);

  const hasActiveFilters = Boolean(search || category || status || sort !== 'newest');

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setStatus('');
    setSort('newest');
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <section className="relative overflow-hidden pt-2 pb-6 sm:pb-8 lg:pb-10">
        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_1fr] xl:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div className="flex flex-col items-start">
            <button
              type="button"
              onClick={startTour}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <SparklesIcon className="size-3.5" />
              <span>Public Product Roadmap 2026</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <span>Tutorial</span>
                <PlayIcon className="size-2.5 fill-current" />
              </span>
            </button>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl text-foreground">
              Shape what we <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-teal-900 via-teal-700 to-cyan-500 bg-clip-text text-transparent">
                build next.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Collaborate directly with product engineering. Propose innovative features, upvote
              critical enhancements, and follow real-time progress from concept to shipped code.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3.5 py-1.5 text-xs text-muted-foreground">
                <FlameIcon className="size-3.5 text-cyan-600" />
                <span className="font-semibold text-foreground">{posts.length > 0 ? posts.length : '50+'}</span>
                <span>Ideas Tracked</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3.5 py-1.5 text-xs text-muted-foreground">
                <RocketIcon className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Sprint Q3</span>
                <span>Active Build</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <CreatePostDialog onCreated={(post) => setPosts((prev) => [post, ...prev])} />
              <Button
                variant="outline"
                className="rounded-md border-border bg-white hover:bg-slate-50 px-5 text-sm font-medium shadow-sm"
                render={<Link to="/roadmap" />}
              >
                <span>View Live Roadmap</span>
                <ArrowRightIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={startTour}
                className="rounded-md border-border bg-white hover:bg-slate-50 px-4 text-sm font-semibold shadow-sm inline-flex items-center gap-2 text-slate-700 hover:text-primary transition-all hover:scale-[1.02] cursor-pointer"
              >
                <PlayIcon className="size-3.5 fill-primary text-primary" />
                <span>How It Works</span>
              </Button>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-full max-w-2xl xl:max-w-3xl rounded-xl border border-border bg-white p-2 sm:p-3 shadow-md">
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src="/assets/images/hero_roadmap_3d.jpg"
                  alt="SaaS Product Roadmap"
                  className="aspect-video w-full object-cover"
                />
              </div>
              
              <div className="absolute -bottom-8 -left-8 hidden sm:flex flex-col gap-2 rounded-xl border border-border bg-white/70 backdrop-blur-md p-6 shadow-xl text-sm z-10 max-w-[320px] animate-fade-up">
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <span className="relative flex size-2.5">
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  </span>
                  <span className="font-semibold text-emerald-700">All systems operational</span>
                </div>
                <div className="flex items-start gap-2.5 text-slate-700 font-medium pt-2">
                  <FlameIcon className="size-5 shrink-0 text-amber-500" />
                  <span className="leading-snug">Q3 Sprint: 14 new features planned & in active development</span>
                </div>
                <div className="font-mono text-[10px] text-slate-500/80 pt-2 tracking-wider">
                  PUBLIC BOARD v2.4 | COMMUNITY DRIVEN
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 -mb-[1px]">
          {categoryTabs.map((tab) => {
            const isSelected = category === tab.value;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => {
                  setCategory(tab.value);
                  setPage(1);
                }}
                className={cn(
                  'relative inline-flex items-center gap-2 px-3.5 py-2.5 text-sm sm:text-base font-bold transition-all cursor-pointer rounded-t-lg border-b-2',
                  isSelected
                    ? 'border-primary text-primary bg-primary/10 shadow-xs font-extrabold'
                    : 'border-transparent text-slate-700 hover:text-foreground hover:bg-slate-100/80'
                )}
              >
                <TabIcon className={cn('size-4 shrink-0', isSelected ? 'text-primary' : 'text-slate-500')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-primary transition-colors cursor-pointer pb-2"
          >
            <XIcon className="size-3.5" />
            <span>Clear filters</span>
          </button>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-none border border-border bg-white p-3 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div className="relative">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Search features, requests..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-10 rounded-md border-border bg-slate-50 pl-9 pr-9 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>

              <Select
                value={status || 'all'}
                onValueChange={(v) => {
                  setStatus(v === 'all' ? '' : String(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-md border-border bg-slate-50 shadow-none hover:bg-slate-100 text-sm font-semibold text-foreground">
                  <CircleDashedIcon className="text-muted-foreground size-4" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="all">All statuses</SelectItem>
                  {POST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <Select
                value={sort}
                onValueChange={(v) => {
                  setSort((v as PostSort) || 'newest');
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 rounded-md border-border bg-slate-50 shadow-none hover:bg-slate-100 text-sm font-semibold text-foreground">
                  <ArrowUpDownIcon className="text-muted-foreground size-4" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="upvoted">Most upvoted</SelectItem>
                  <SelectItem value="discussed">Most discussed</SelectItem>
                </SelectPopup>
              </Select>
            </div>
          </div>

          <section id="feed-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <FeedSkeleton />
            ) : error ? (
              <EmptyState title="Could not load feed" description={error} />
            ) : posts.length === 0 ? (
              <EmptyState
                variant="search"
                title="No requests match your criteria"
                description="Try changing filters or be the first to propose this idea to the community."
              />
            ) : (
              posts.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={index}
                  voteDisabled={isPending(post.id)}
                  onToggleVote={handleVote}
                  onClick={() => setSelectedPost(post)}
                />
              ))
            )}
          </section>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-none border border-border bg-white px-5 py-3 shadow-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md border-border"
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-muted-foreground text-xs font-mono">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-md border-border"
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-none border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <RocketIcon className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Roadmap Radar</h3>
              </div>
              <Link to="/roadmap" className="text-xs text-primary hover:underline font-medium">
                Open Kanban →
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <CircleDashedIcon className="size-3 text-warning" />
                    Under Review
                  </span>
                  <span className="text-muted-foreground">{radarCounts.under_review}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-warning transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(15, (radarCounts.under_review / Math.max(1, posts.length)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <MapPinnedIcon className="size-3 text-teal-700" />
                    Planned
                  </span>
                  <span className="text-muted-foreground">{radarCounts.planned}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-teal-700 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(25, (radarCounts.planned / Math.max(1, posts.length)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <RocketIcon className="size-3 text-cyan-600" />
                    In Progress
                  </span>
                  <span className="text-muted-foreground">{radarCounts.in_progress}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-cyan-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(40, (radarCounts.in_progress / Math.max(1, posts.length)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground font-medium">
                    <CheckCircle2Icon className="size-3 text-slate-500" />
                    Shipped
                  </span>
                  <span className="text-muted-foreground">{radarCounts.completed}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-slate-500 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(55, (radarCounts.completed / Math.max(1, posts.length)) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-none border border-border bg-slate-50 p-5 shadow-sm">
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/images/community_spotlight.jpg"
                  alt="Spotlight"
                  className="size-12 rounded-lg border border-border object-cover shadow-sm"
                />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Priority Fast-Track</h4>
                  <p className="text-xs text-muted-foreground">Community power</p>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ideas reaching <span className="text-primary font-semibold">10+ upvotes</span> are reviewed
                weekly and fast-tracked to engineering.
              </p>
              <CreatePostDialog onCreated={(post) => setPosts((prev) => [post, ...prev])} />
            </div>
          </div>

          {trendingPosts.length > 0 && (
            <div className="rounded-none border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <TrendingUpIcon className="size-4 text-cyan-600" />
                <h3 className="text-sm font-semibold text-foreground">Trending This Week</h3>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {trendingPosts.map((tp, idx) => (
                  <Link
                    key={tp.id}
                    to={`/posts/${tp.id}`}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-transparent p-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {idx + 1}. {tp.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{tp.category}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-xs font-mono font-bold text-accent-foreground border border-cyan-200/60">
                      ▲ {tp.voteCount}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-none border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <LayersIcon className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Explore by Domain</h3>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {POST_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat === category ? '' : cat);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                    category === cat
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <PostDetailModal
        post={selectedPost}
        isOpen={Boolean(selectedPost)}
        onClose={() => setSelectedPost(null)}
        onToggleVote={handleVote}
        voteDisabled={selectedPost ? isPending(selectedPost.id) : false}
        onPostUpdated={(updatedPost) => {
          setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
        }}
      />

    </div>
  );
}
