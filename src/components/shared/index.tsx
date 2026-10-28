import {
  ShoppingBag, PartyPopper, Package, Bike, UtensilsCrossed, Warehouse, Briefcase,
  MapPin, Link as LinkIcon, Star, ShieldCheck, ShieldQuestion, BadgeCheck,
  type LucideIcon,
} from 'lucide-react';
import type { JobCategory, VerificationState, ApplicationStatus, JobStatus } from '@/types';
import {
  CATEGORY_LABELS, APPLICATION_STATUS_LABELS, JOB_STATUS_LABELS,
  VERIFICATION_LABELS,
} from '@/types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function CategoryIcon({ category, className }: { category: JobCategory; className?: string }) {
  const map: Record<JobCategory, LucideIcon> = {
    retail: ShoppingBag,
    event_support: PartyPopper,
    packing: Package,
    delivery: Bike,
    restaurant: UtensilsCrossed,
    warehouse: Warehouse,
    office_support: Briefcase,
  };
  const Icon = map[category];
  return <Icon className={className} />;
}

export function CategoryBadge({ category, size = 'md' }: { category: JobCategory; size?: 'sm' | 'md' }) {
  return (
    <Badge variant="teal" size={size}>
      <span className="flex items-center gap-1">
        <CategoryIcon category={category} className="h-3.5 w-3.5" />
        {CATEGORY_LABELS[category]}
      </span>
    </Badge>
  );
}

export function VerificationBadge({ state, size = 'md' }: { state: VerificationState; size?: 'sm' | 'md' }) {
  if (state === 'verified') {
    return (
      <Badge variant="success" size={size}>
        <BadgeCheck className="h-3.5 w-3.5" />
        {VERIFICATION_LABELS.verified}
      </Badge>
    );
  }
  if (state === 'demo_verified') {
    return (
      <Badge variant="brand" size={size}>
        <ShieldCheck className="h-3.5 w-3.5" />
        {VERIFICATION_LABELS.demo_verified}
      </Badge>
    );
  }
  return (
    <Badge variant="neutral" size={size}>
      <ShieldQuestion className="h-3.5 w-3.5" />
      {VERIFICATION_LABELS.unverified}
    </Badge>
  );
}

export function StarRating({
  value,
  count,
  size = 'sm',
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={cn(
              dim,
              i <= Math.round(value) ? 'fill-warning-500 text-warning-500' : 'fill-canvas-200 text-canvas-200',
            )}
          />
        ))}
      </span>
      <span className={cn('font-semibold text-ink-700', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {value > 0 ? value.toFixed(1) : 'New'}
      </span>
      {count !== undefined && count > 0 && (
        <span className="text-xs text-ink-400">({count})</span>
      )}
    </span>
  );
}

const appStatusVariant: Record<ApplicationStatus, 'neutral' | 'accent' | 'brand' | 'success' | 'error' | 'warning'> = {
  applied: 'neutral',
  reviewed: 'accent',
  shortlisted: 'brand',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'warning',
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge variant={appStatusVariant[status]}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

const jobStatusVariant: Record<JobStatus, 'neutral' | 'success' | 'warning' | 'ink'> = {
  draft: 'neutral',
  published: 'success',
  paused: 'warning',
  completed: 'ink',
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={jobStatusVariant[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-display font-extrabold text-ink-900 select-none group tracking-tight', className)}>
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-teal-400 text-white shadow-sm ring-1 ring-brand-400/30 group-hover:shadow-glow transition-all duration-200">
        <MapPin className="h-4.5 w-4.5" />
        <LinkIcon className="absolute h-3 w-3 text-teal-200 -bottom-0.5 -right-0.5" />
      </span>
      <span className="text-xl leading-none">
        Local<span className="bg-gradient-to-r from-brand-600 to-teal-600 bg-clip-text text-transparent">Connect</span>
      </span>
    </span>
  );
}

export function Avatar({ name, color, size = 'md', className }: { name: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const initials = (name || 'U')
    .trim()
    .split(/\s+/)
    .map((p) => p[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
  const dim = size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-10 w-10 text-sm';
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ring-2 ring-white/60', dim, className)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}
