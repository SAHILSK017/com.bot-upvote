import { STATUS_LABELS, type PostStatus } from '@/types';
import { cn } from '@/lib/utils';
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  MapPinnedIcon,
  RocketIcon,
} from 'lucide-react';

const styles: Record<
  PostStatus,
  { className: string; dotClass: string; pulseClass: string; Icon: typeof RocketIcon }
> = {
  under_review: {
    className: 'bg-amber-50 text-amber-800 border-amber-300 shadow-amber-100/80',
    dotClass: 'bg-amber-500',
    pulseClass: 'bg-amber-400',
    Icon: CircleDashedIcon,
  },
  planned: {
    className: 'bg-teal-50 text-teal-900 border-teal-300/80 shadow-teal-100/60',
    dotClass: 'bg-teal-700',
    pulseClass: 'bg-teal-500',
    Icon: MapPinnedIcon,
  },
  in_progress: {
    className: 'bg-cyan-50 text-cyan-800 border-cyan-300 shadow-cyan-100/80',
    dotClass: 'bg-cyan-500',
    pulseClass: 'bg-cyan-400',
    Icon: RocketIcon,
  },
  completed: {
    className: 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100/80',
    dotClass: 'bg-emerald-500',
    pulseClass: 'bg-emerald-400',
    Icon: CheckCircle2Icon,
  },
};

export function StatusBadge({
  status,
  size = 'md',
}: {
  status: PostStatus;
  size?: 'sm' | 'md';
}) {
  const { className, dotClass, pulseClass, Icon } = styles[status] || styles.under_review;
  const isActive = status === 'in_progress' || status === 'planned';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors shadow-xs',
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <span className="relative flex shrink-0 items-center justify-center">
        {isActive && (
          <span className={cn('absolute inline-flex size-full rounded-full opacity-60 animate-ping', pulseClass)} />
        )}
        <span className={cn('relative rounded-full', isActive ? 'size-2' : 'size-1.5', dotClass)} />
      </span>
      <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      {STATUS_LABELS[status]}
    </span>
  );
}
