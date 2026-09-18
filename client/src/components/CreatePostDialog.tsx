import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  LayersIcon,
  PaletteIcon,
  ZapIcon,
  CheckCircle2Icon,
  RocketIcon,
  AlertCircleIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Field } from '@/components/ui/field';
import { postsApi } from '@/api/posts.api';
import { getErrorMessage } from '@/api/client';
import { toastManager } from '@/components/ui/toast';
import { POST_CATEGORIES, type Post, type PostCategory } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useAuthModal } from '@/context/AuthModalContext';
import { cn } from '@/lib/utils';

const categoryDetails: Record<
  PostCategory,
  { label: string; icon: typeof SparklesIcon; description: string }
> = {
  'UI/UX': {
    label: 'UI/UX',
    icon: PaletteIcon,
    description: 'Design, navigation, interface & animations',
  },
  Integrations: {
    label: 'Integrations',
    icon: ZapIcon,
    description: 'Third-party APIs, webhooks, platforms',
  },
  Performance: {
    label: 'Performance',
    icon: SparklesIcon,
    description: 'Speed, latency, scalability & reliability',
  },
  General: {
    label: 'General',
    icon: LayersIcon,
    description: 'Platform capabilities & miscellaneous ideas',
  },
};

type CreatePostDialogProps = {
  onCreated?: (post: Post) => void;
  size?: 'sm' | 'default';
  trigger?: React.ReactNode;
};

export function CreatePostDialog({
  onCreated,
  size = 'default',
  trigger,
}: CreatePostDialogProps) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PostCategory>('General');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpen(next: boolean) {
    if (next) {
      if (authLoading) return;
      if (!isAuthenticated) {
        openAuthModal('login');
        return;
      }
    }
    setOpen(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Description must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await postsApi.create({
        title: title.trim(),
        description: description.trim(),
        category,
      });
      toastManager.add({
        title: 'Feature request posted!',
        description: 'Your idea is now live for community upvotes and team review.',
        type: 'success',
      });
      const newPost = res.data.data.post;
      onCreated?.(newPost);
      setTitle('');
      setDescription('');
      setCategory('General');
      setOpen(false);
      if (!onCreated) {
        navigate(`/posts/${newPost.id}`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleDiscard() {
    setTitle('');
    setDescription('');
    setCategory('General');
    setError(null);
    setOpen(false);
  }

  const isDescriptionValid = description.trim().length >= 10;
  const isTitleValid = title.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      {trigger ? (
        <DialogTrigger render={trigger as React.ReactElement} />
      ) : size === 'sm' ? (
        <DialogTrigger
          render={
            <Button
              size="sm"
              data-tour="new-request"
              className="btn-primary-glow inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
            />
          }
        >
          <PlusIcon className="size-3.5" />
          <span>New request</span>
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <Button
              data-tour="new-request"
              className="btn-primary-glow inline-flex items-center gap-2 rounded-full border-0 px-5 text-sm font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            />
          }
        >
          <SparklesIcon className="size-4" />
          <span>New request</span>
        </DialogTrigger>
      )}

      <DialogPopup className="max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl p-0">
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <RocketIcon className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                Submit a Feature Request
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Propose an idea or enhancement directly to the product engineering team.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <DialogPanel className="flex flex-col gap-4 p-5 sm:p-6 overflow-y-auto flex-1 min-h-0">
            {/* Title */}
            <Field>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="post-title" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Feature Title <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {title.length}/200
                </span>
              </div>
              <Input
                id="post-title"
                placeholder="e.g., Export roadmap to PDF or CSV"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                disabled={submitting}
                className="h-10 rounded-lg border-border bg-slate-50/70 text-sm font-medium focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all"
              />
            </Field>

            {/* Category Selector (Visual Cards) */}
            <Field>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Category <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">Select relevant domain</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {POST_CATEGORIES.map((cat) => {
                  const details = categoryDetails[cat];
                  const Icon = details.icon;
                  const isSelected = category === cat;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      disabled={submitting}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-center transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30 font-bold'
                          : 'border-border bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-100/60 font-medium'
                      )}
                    >
                      <Icon className={cn('size-4', isSelected ? 'text-primary' : 'text-slate-500')} />
                      <span className="text-xs">{details.label}</span>
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Description */}
            <Field>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="post-desc" className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Description & Use Case <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {isDescriptionValid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle2Icon className="size-3" /> Ready
                    </span>
                  ) : (
                    <span className="text-muted-foreground font-mono">
                      {Math.max(0, 10 - description.trim().length)} chars needed
                    </span>
                  )}
                </div>
              </div>

              <Textarea
                id="post-desc"
                placeholder="Explain the problem this solves, who benefits from it, and what the ideal outcome would look like (markdown supported)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={10}
                maxLength={10000}
                rows={4}
                disabled={submitting}
                className="rounded-lg border-border bg-slate-50/70 p-3 text-sm font-normal leading-relaxed focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all resize-none"
              />
            </Field>

            {/* Community Pro-Tip Banner */}
            <div className="flex items-start gap-2.5 rounded-lg border border-primary/15 bg-primary/5 p-3 text-xs text-slate-700">
              <SparklesIcon className="size-4 shrink-0 text-primary mt-0.5" />
              <p className="leading-snug">
                <strong>Community Tip:</strong> Clear and detailed requests receive significantly more
                upvotes and are prioritized faster by product leads.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </DialogPanel>

          {/* Footer Controls */}
          <div className="shrink-0 flex items-center justify-between border-t border-border bg-slate-50 px-6 py-3.5">
            <span className="hidden sm:inline-block text-[11px] text-muted-foreground">
              Markdown formatting supported
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscard}
                disabled={submitting}
                className="rounded-lg border-border bg-white text-xs font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
              >
                <Trash2Icon className="size-3.5 opacity-70" />
                <span>Discard</span>
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={submitting || !isTitleValid || !isDescriptionValid}
                className="btn-primary-glow inline-flex items-center gap-1.5 rounded-lg text-xs font-bold shadow-xs px-4 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2Icon className="size-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <RocketIcon className="size-3.5" />
                    <span>Publish</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
