import { InboxIcon, SearchXIcon, SparklesIcon } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * Designed empty state with icon treatment.
 */
export function EmptyState({
  title = 'Nothing here yet',
  description = 'Try adjusting filters or check back later.',
  variant = 'default',
}: {
  title?: string;
  description?: string;
  variant?: 'default' | 'search';
}) {
  const Icon = variant === 'search' ? SearchXIcon : InboxIcon;
  return (
    <Empty className="rounded-2xl border border-white/8 bg-[var(--surface-elevated)] py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="tracking-tight">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        <div className="text-primary/70 mt-2 inline-flex items-center gap-1.5 text-xs">
          <SparklesIcon className="size-3.5" />
          Ideas start conversations
        </div>
      </EmptyHeader>
    </Empty>
  );
}
