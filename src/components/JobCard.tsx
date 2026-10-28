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
        'group relative flex flex-col p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-cardHover hover:border-brand-300 cursor-pointer bg-white',
        className,
      )}
      onClick={onOpen}
      role="button"
      aria-label={job.title}
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-teal-50 text-brand-600 ring-1 ring-brand-200/60 shadow-sm group-hover:scale-105 transition-transform">
            <CategoryIcon category={job.category} className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
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
              className="rounded-lg p-2 text-ink-400 hover:bg-brand-50 hover:text-brand-600 active:scale-95 transition-all"
              aria-label={saved ? 'Unsave job' : 'Save job'}
              title={saved ? 'Saved' : 'Save'}
            >
              {saved ? (
                <BookmarkCheck className="h-5 w-5 text-brand-600 fill-brand-100" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-600">
        <span className="inline-flex items-center gap-1 font-medium">
          <MapPin className="h-3.5 w-3.5 text-brand-600" />
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

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-200/70">
          {CATEGORY_LABELS[job.category]}
        </span>
        <span className="inline-flex items-center rounded-lg bg-canvas-100 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200">
          {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
        </span>
        {job.workersNeeded > 1 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-600 bg-canvas-100/80 px-2 py-0.5 rounded-md">
            <Users className="h-3.5 w-3.5 text-ink-400" />
            {job.workersNeeded} open
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-canvas-100 pt-3.5">
        <div>
          <div className="inline-flex items-baseline gap-1 bg-brand-50/70 px-2.5 py-1 rounded-xl ring-1 ring-brand-200/60">
            <IndianRupee className="h-4 w-4 text-brand-700 font-bold self-center" />
            <span className="text-xl font-extrabold text-brand-900 tracking-tight">{formatINR(job.payAmount)}</span>
            <span className="text-[11px] font-semibold text-brand-700">{PAY_BASIS_LABELS[job.payBasis]}</span>
          </div>
          {employer && (
            <div className="mt-2">
              <VerificationBadge state={job.verification} size="sm" />
            </div>
          )}
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 group-hover:text-brand-700 group-hover:translate-x-1 transition-all">
          View details →
        </span>
      </div>
    </Card>
  );
}
