import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TagVariant =
  | 'preferred'
  | 'disliked'
  | 'extra'
  | 'cancelled'
  | 'matched'
  | 'default';

const variantStyles: Record<TagVariant, string> = {
  preferred: 'bg-pink-100 text-pink-800 border-pink-200',
  disliked: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-[#8B5E3C]/15 text-[#8B5E3C] border-[#8B5E3C]/40 line-through',

  extra: 'bg-orange-100 text-orange-800 border-orange-200',
  matched: 'bg-green-100 text-green-800 border-green-200',
  default: 'bg-gray-100 text-gray-700 border-gray-200',
};

interface TagBadgeProps {
  tag: string;
  variant?: TagVariant;
  className?: string;
}

export function TagBadge({ tag, variant = 'default', className }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-normal', variantStyles[variant], className)}
    >
      {tag}
    </Badge>
  );
}
