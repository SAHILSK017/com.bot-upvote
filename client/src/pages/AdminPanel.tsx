import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  RefreshCwIcon,
  DownloadIcon,
  SearchIcon,
  XIcon,
  FlameIcon,
  MessageSquareIcon,
  CheckCircle2Icon,
  TrendingUpIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  CalendarIcon,
  FilterIcon,
  LayersIcon,
  ActivityIcon,
  AlertCircleIcon,
  Trash2Icon,
  CheckIcon,
} from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useVote } from '@/hooks/useVote';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { VoteButton } from '@/components/VoteButton';
import { PostDetailModal } from '@/components/PostDetailModal';
import { toastManager } from '@/components/ui/toast';
import { formatDate } from '@/utils/format';
import { categoryConfig } from '@/utils/categoryConfig';
import {
  POST_CATEGORIES,
  POST_STATUSES,
  STATUS_LABELS,
  type Post,
  type PostStatus,
  type PostSort,
} from '@/types';
import { cn } from '@/lib/utils';


export default function AdminPanelPage() {
  const { user, isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { toggleVote, isPending } = useVote();

  function handleVote(post: Post) {
    void toggleVote(post, {
      onOptimistic: (updated) => {
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSelectedPost((prev) => (prev && prev.id === updated.id ? updated : prev));
      },
      onRollback: (updated) => {
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSelectedPost((prev) => (prev && prev.id === updated.id ? updated : prev));
      },
      onSuccess: (updated) => {
        setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        setSelectedPost((prev) => (prev && prev.id === updated.id ? updated : prev));
      },
    });
  }

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<PostSort>('newest');

  async function load(quiet = false) {
    if (quiet) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.listPosts({ sort: 'newest', limit: 50 });
      setPosts(res.data.data.posts);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  async function changeStatus(post: Post, nextStatus: PostStatus) {
    if (updatingId || post.status === nextStatus) return;
    setUpdatingId(post.id);
    try {
      const res = await adminApi.updateStatus(post.id, nextStatus);
      const updated = res.data.data.post;
      setPosts((prev) => prev.map((p) => (p.id === post.id ? updated : p)));
      setSelectedPost((prev) => (prev && prev.id === post.id ? updated : prev));
      toastManager.add({
        title: res.data.data.outOfSequence ? 'Lifecycle Status Overridden' : 'Lifecycle Status Updated',
        description: `"${post.title}" moved to ${STATUS_LABELS[nextStatus]}`,
        type: res.data.data.outOfSequence ? 'warning' : 'success',
      });
    } catch (err) {
      toastManager.add({
        title: 'Status update failed',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeletePost(post: Post) {
    if (deletingId) return;
    setDeletingId(post.id);
    setConfirmDeleteId(null);
    try {
      await adminApi.deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      if (selectedPost?.id === post.id) setSelectedPost(null);
      toastManager.add({
        title: 'Post deleted',
        description: `"${post.title}" has been permanently removed.`,
        type: 'success',
      });
    } catch (err) {
      toastManager.add({
        title: 'Failed to delete post',
        description: getErrorMessage(err),
        type: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  }

  // Client-side analytics
  const stats = useMemo(() => {
    const total = posts.length;
    const underReview = posts.filter((p) => p.status === 'under_review').length;
    const planned = posts.filter((p) => p.status === 'planned').length;
    const inProgress = posts.filter((p) => p.status === 'in_progress').length;
    const completed = posts.filter((p) => p.status === 'completed').length;
    const closed = 0;
    const totalVotes = posts.reduce((sum, p) => sum + (p.voteCount || 0), 0);
    const totalComments = posts.reduce((sum, p) => sum + (p.commentCount || 0), 0);
    const activePipeline = planned + inProgress;
    const deliveryRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      underReview,
      planned,
      inProgress,
      completed,
      closed,
      totalVotes,
      totalComments,
      activePipeline,
      deliveryRate,
    };
  }, [posts]);

  // Filtered and sorted dataset
  const filteredPosts = useMemo(() => {
    return posts
      .filter((post) => {
        if (statusFilter !== 'all' && post.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && post.category !== categoryFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = post.title.toLowerCase().includes(q);
          const matchDesc = post.description?.toLowerCase().includes(q);
          const matchAuthor = post.author?.name?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'upvoted') return b.voteCount - a.voteCount;
        if (sortOrder === 'discussed') return b.commentCount - a.commentCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [posts, statusFilter, categoryFilter, search, sortOrder]);

  function exportCSV() {
    if (filteredPosts.length === 0) {
      toastManager.add({ title: 'No records to export', type: 'error' });
      return;
    }
    const headers = ['ID', 'Title', 'Category', 'Status', 'Votes', 'Comments', 'Author Name', 'Author Email', 'Created At'];
    const rows = filteredPosts.map((p) => [
      p.id,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      p.category,
      p.status,
      p.voteCount,
      p.commentCount,
      `"${(p.author?.name || 'Anonymous').replace(/"/g, '""')}"`,
      `"${(p.author?.email || '').replace(/"/g, '""')}"`,
      new Date(p.createdAt).toISOString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `roadmap_triage_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastManager.add({
      title: 'Export Generated',
      description: `${filteredPosts.length} triage records exported to CSV.`,
      type: 'success',
    });
  }

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSortOrder('newest');
  }

  const hasActiveFilters = search || statusFilter !== 'all' || categoryFilter !== 'all' || sortOrder !== 'newest';

  return (
    <div className="flex flex-col gap-8 pb-16 animate-fade-up">
      <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  Admin Console
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-500/20">
                  Governance
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-0.5">
                Product roadmap triage, lifecycle transition controls, and community telemetry.
              </p>
            </div>
          </div>
        </div>

        {/* Global Dashboard Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs">
            <span className="relative flex size-2">
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            </span>
            <span>Admin: {user?.name || 'Administrator'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(true)}
            disabled={isRefreshing || isLoading}
            className="rounded-md border-border bg-white text-xs font-semibold hover:bg-slate-50 shadow-xs"
          >
            <RefreshCwIcon className={cn('size-3.5', isRefreshing && 'animate-spin text-primary')} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="rounded-md border-border bg-white text-xs font-semibold hover:bg-slate-50 shadow-xs"
          >
            <DownloadIcon className="size-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className="rounded-md text-xs font-semibold shadow-xs"
            render={<Link to="/roadmap" />}
          >
            <span>Live Roadmap</span>
            <ArrowUpRightIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Proposals
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <LayersIcon className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.total}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">in database</span>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <FlameIcon className="size-3.5 text-amber-500" />
              <strong className="font-semibold">{stats.totalVotes}</strong> votes
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <MessageSquareIcon className="size-3.5 text-sky-500" />
              <strong className="font-semibold">{stats.totalComments}</strong> replies
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Needs Triage
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <AlertCircleIcon className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-900 font-mono">
              {stats.underReview}
            </span>
            <span className="text-xs font-bold text-amber-700">
              {stats.underReview > 0 ? 'Pending decision' : 'Inbox zero'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-amber-200/60 pt-3 text-xs text-amber-800">
            <span>Awaiting moderator action</span>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'under_review' ? 'all' : 'under_review')}
              className="font-bold underline hover:text-amber-950 cursor-pointer"
            >
              Filter queue →
            </button>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Pipeline
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActivityIcon className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.activePipeline}
            </span>
            <span className="text-xs font-semibold text-primary font-bold">Planned & Building</span>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
            <span className="font-semibold text-slate-700">{stats.planned} Planned</span>
            <span>•</span>
            <span className="font-semibold text-slate-700">{stats.inProgress} In Progress</span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-border bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Shipped Features
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2Icon className="size-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-700 font-mono">
              {stats.completed}
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              {stats.deliveryRate}% resolution
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Closed/Archived: {stats.closed}</span>
            <span className="font-medium text-emerald-700">Production ready</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Search & Dropdowns */}
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Search Input */}
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search proposal, author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-lg border-border bg-slate-50 pl-9 pr-8 text-sm font-medium focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(String(v))}>
              <SelectTrigger className="h-10 rounded-lg border-border bg-slate-50 text-sm font-semibold text-foreground hover:bg-slate-100">
                <FilterIcon className="text-muted-foreground size-3.5" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="all">All Statuses ({posts.length})</SelectItem>
                {POST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]} ({posts.filter((p) => p.status === s).length})
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>

            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(String(v))}>
              <SelectTrigger className="h-10 rounded-lg border-border bg-slate-50 text-sm font-semibold text-foreground hover:bg-slate-100">
                <LayersIcon className="text-muted-foreground size-3.5" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="all">All Categories</SelectItem>
                {POST_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} ({posts.filter((p) => p.category === c).length})
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>

            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as PostSort)}>
              <SelectTrigger className="h-10 rounded-lg border-border bg-slate-50 text-sm font-semibold text-foreground hover:bg-slate-100">
                <TrendingUpIcon className="text-muted-foreground size-3.5" />
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value="newest">Newest Proposals First</SelectItem>
                <SelectItem value="upvoted">Highest Upvotes First</SelectItem>
                <SelectItem value="discussed">Most Comments First</SelectItem>
              </SelectPopup>
            </Select>
          </div>

          {/* Right: Results Count & Clear */}
          <div className="flex items-center justify-between gap-3 pt-2 sm:pt-0 lg:justify-end">
            <span className="text-xs font-semibold text-muted-foreground font-mono">
              Showing <strong className="text-foreground">{filteredPosts.length}</strong> of{' '}
              {posts.length}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-8 text-xs font-bold text-slate-600 hover:text-primary"
              >
                <XIcon className="size-3" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main SaaS Data Table View */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-white">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <RefreshCwIcon className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading triage ledger...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
          <AlertCircleIcon className="size-8 text-destructive" />
          <p className="text-base font-semibold text-destructive">Failed to load admin ledger</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Try Again
          </Button>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-white p-12 text-center">
          <FilterIcon className="size-8 text-muted-foreground/50" />
          <h3 className="text-base font-bold text-foreground">No matching proposals found</h3>
          <p className="max-w-sm text-xs text-muted-foreground">
            No feature requests match your current search query or filter configuration.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters} className="mt-2">
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Main Card Grid View (Matching User Card UI from Home Page) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((post, index) => {
              const cat = categoryConfig[post.category] || categoryConfig.General;
              const CatIcon = cat.icon;
              const authorInitial = post.author?.name?.[0]?.toUpperCase() || 'U';
              const isUpdating = updatingId === post.id;
              const isDeleting = deletingId === post.id;
              const isConfirmingDelete = confirmDeleteId === post.id;

              // Clean markdown syntax for description preview
              const cleanDescription = (post.description || '')
                .replace(/^#{1,6}\s+/gm, '')
                .replace(/[*_~`]/g, '')
                .trim();

              return (
                <article
                  key={post.id}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setSelectedPost(post);
                  }}
                  className={cn(
                    'group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-300/90 bg-white p-5 shadow-xs cursor-pointer select-none',
                    'transition-all duration-200 hover:border-primary hover:ring-2 hover:ring-primary/20 hover:shadow-md hover:-translate-y-0.5',
                    (isUpdating || isDeleting) && 'opacity-60 pointer-events-none'
                  )}
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  <div className="flex items-start gap-4 sm:gap-4.5">
                    {/* Upvote Button Control */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <VoteButton
                        post={post}
                        onToggle={handleVote}
                        disabled={isPending(post.id)}
                        className="self-start mt-0.5"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Status & Category Bar */}
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={post.status} size="sm" />
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
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground/70">
                          #{post.id.slice(-6)}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg leading-snug">
                        <span className="group-hover:text-primary transition-colors inline-flex items-center gap-1.5">
                          <span>{post.title}</span>
                          <ArrowRightIcon className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary shrink-0" />
                        </span>
                      </h3>

                      {/* Description */}
                      <p className="mt-2 line-clamp-2 text-xs sm:text-sm leading-relaxed text-muted-foreground font-normal">
                        {cleanDescription || 'No description provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Admin Lifecycle Stage Bar */}
                  <div
                    className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50/90 p-2.5 border border-border"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Lifecycle Stage:</span>
                      <div className="w-36 sm:w-44">
                        <Select
                          value={post.status}
                          disabled={isUpdating}
                          onValueChange={(val) => void changeStatus(post, val as PostStatus)}
                        >
                          <SelectTrigger className="h-8 rounded-md border-border bg-white text-xs font-bold text-foreground shadow-2xs hover:bg-slate-50 focus:ring-1 focus:ring-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectPopup>
                            {POST_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs font-semibold py-1.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'size-2 rounded-full',
                                      s === 'under_review' && 'bg-amber-500',
                                      s === 'planned' && 'bg-primary',
                                      s === 'in_progress' && 'bg-sky-500',
                                      s === 'completed' && 'bg-emerald-500'
                                    )}
                                  />
                                  <span>{STATUS_LABELS[s]}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectPopup>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Confirm delete UI */}
                      {isConfirmingDelete ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] font-bold text-red-600">Delete post?</span>
                          <button
                            type="button"
                            onClick={() => void handleDeletePost(post)}
                            className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-red-600 transition-colors cursor-pointer"
                          >
                            <CheckIcon className="size-3" />
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          >
                            <XIcon className="size-3" />
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(post.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Delete this post"
                        >
                          <Trash2Icon className="size-3" />
                          <span>Delete</span>
                        </button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-md border-border bg-white px-3 text-xs font-semibold hover:bg-slate-100 hover:text-primary shadow-2xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(null);
                          setSelectedPost(post);
                        }}
                      >
                        <span>Review</span>
                        <ArrowUpRightIcon className="size-3 ml-1" />
                      </Button>
                    </div>
                  </div>

                  {/* Meta Footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-y-2 border-t border-border/70 pt-3 text-xs text-muted-foreground">
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

                    <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-border transition-colors group-hover:bg-primary/5 group-hover:text-primary group-hover:ring-primary/20">
                      <MessageSquareIcon className="size-3.5 opacity-70" />
                      <span>
                        {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Table / Ledger Footer Summary */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/60 px-6 py-3.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheckIcon className="size-4 text-emerald-600" />
              <span>RBAC Policy Active: Only authorized team accounts can alter lifecycle flags.</span>
            </div>
            <div className="font-mono text-[11px] text-slate-500">
              Total Proposals Loaded: {posts.length} | Live Sync
            </div>
          </div>
        </div>
      )}

      {/* Post Inspection & Discussion Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          isOpen={Boolean(selectedPost)}
          onClose={() => setSelectedPost(null)}
          onToggleVote={handleVote}
          onPostUpdated={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setSelectedPost(updated);
          }}
          onStatusChange={async (post, status) => { await changeStatus(post, status); }}
          voteDisabled={isPending(selectedPost.id)}
        />
      )}
    </div>
  );
}
