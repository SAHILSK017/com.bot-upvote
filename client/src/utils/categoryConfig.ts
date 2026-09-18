import { LayersIcon, PaletteIcon, SparklesIcon, ZapIcon } from 'lucide-react';
import type { PostCategory } from '@/types';

/**
 * Shared category display configuration used across PostCard, PostDetailModal,
 * and AdminPanel. Centralised here to avoid duplication.
 */
export const categoryConfig: Record<
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
