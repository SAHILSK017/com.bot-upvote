import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

/**
 * Renders markdown content with sensible prose defaults.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2',
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
