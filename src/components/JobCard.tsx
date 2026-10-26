import { type Job, type ApplicationStatus, CATEGORY_LABELS, PAY_BASIS_LABELS, EMPLOYMENT_TYPE_LABELS } from '@/types';
import { Card } from '@/components/ui/Card';
import { CategoryIcon, VerificationBadge, ApplicationStatusBadge } from '@/components/shared';
import { Avatar } from '@/components/shared';
import { MapPin, Clock, Calendar, IndianRupee, Bookmark, BookmarkCheck, Users } from 'lucide-react';
import { formatINR, formatDate, shiftDuration, timeTo12h, cn } from '@/lib/utils';
import type { Database } from '@/types';

interface JobCardProps {
  job: Job;
  db: Database;
  saved?: boolean;
  applicationStatus?: ApplicationStatus;
  onToggleSave?: () => void;
  onOpen?: () => void;
  showEmployer?: boolean;
  className?: string;
}

export function JobCard({
  job,
  db,
  saved,
  applicationStatus,
  onToggleSave,
  onOpen,
  showEmployer = true,
  className,
}: JobCardProps) {
  const employer = db.employerProfiles.find((e) => e.id === job.employerId);
  const user = employer ? db.users.find((u) => u.id === employer.userId) : undefined;

  return (
    <Card
      className={cn(
        'group relative flex flex-col p-5 transition-all hover:shadow-cardHover hover:border-brand-200 cursor-pointer',
        className,
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <CategoryIcon category={job.category} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink-900 group-hover:text-brand-700">
              {job.title}
            </h3>
            {showEmployer && employer && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-500">
                {user && <Avatar name={user.name} color={user.avatarColor} size="sm" />}
                <span className="truncate font-medium text-ink-700">{employer.businessName}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {applicationStatus && <ApplicationStatusBadge status={applicationStatus} />}
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave();
              }}
              className="rounded-lg p-2 text-ink-400 hover:bg-canvas-100 hover:text-brand-600 transition-colors"
              aria-label={saved ? 'Unsave job' : 'Save job'}
              title={saved ? 'Saved' : 'Save'}
            >
              {saved ? (
                <BookmarkCheck className="h-5 w-5 text-brand-600" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-ink-400" />
          {job.area}, {job.city}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 text-ink-400" />
          {formatDate(job.date)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-ink-400" />
          {timeTo12h(job.startTime)}–{timeTo12h(job.endTime)} · {shiftDuration(job.startTime, job.endTime)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 ring-1 ring-inset ring-teal-200">
          {CATEGORY_LABELS[job.category]}
        </span>
        <span className="inline-flex items-center rounded-full bg-canvas-100 px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200">
          {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
        </span>
        {job.workersNeeded > 1 && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <Users className="h-3.5 w-3.5" />
            {job.workersNeeded} open
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-canvas-100 pt-3.5">
        <div>
          <div className="flex items-baseline gap-1">
            <IndianRupee className="h-4 w-4 text-brand-600" />
            <span className="text-xl font-extrabold text-ink-900">{formatINR(job.payAmount)}</span>
            <span className="text-xs font-medium text-ink-500">{PAY_BASIS_LABELS[job.payBasis]}</span>
          </div>
          {employer && (
            <div className="mt-1.5">
              <VerificationBadge state={job.verification} size="sm" />
            </div>
          )}
        </div>
        <span className="text-sm font-semibold text-brand-600 group-hover:translate-x-0.5 transition-transform">
          View details →
        </span>
      </div>
    </Card>
  );
}
