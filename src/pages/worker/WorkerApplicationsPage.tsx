import { useMemo, useState } from 'react';
import { Frown, Search } from 'lucide-react';
import { useDB, useSession, getApplicationsForWorker, withdrawApplication } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Field';
import { ApplicationStatusBadge, CategoryIcon, Avatar, VerificationBadge, StarRating } from '@/components/shared';
import { APPLICATION_STATUS_LABELS, PAY_BASIS_LABELS, type ApplicationStatus } from '@/types';
import { formatINR, formatDate, formatRelative } from '@/lib/utils';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const STATUSES: ApplicationStatus[] = ['applied', 'reviewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn'];

export function WorkerApplicationsPage() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const workerUserId = session.userId ?? '';
  const allApps = getApplicationsForWorker(db, workerUserId);

  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [query, setQuery] = useState('');
  const [detailApp, setDetailApp] = useState<string | null>(null);
  const [withdrawId, setWithdrawId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = allApps;
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((a) => {
        const job = db.jobs.find((j) => j.id === a.jobId);
        return job?.title.toLowerCase().includes(q) || job?.area.toLowerCase().includes(q);
      });
    }
    return list;
  }, [allApps, statusFilter, query, db.jobs]);

  const detail = detailApp ? allApps.find((a) => a.id === detailApp) : null;
  const detailJob = detail ? db.jobs.find((j) => j.id === detail.jobId) : null;
  const detailEmployer = detailJob ? db.employerProfiles.find((e) => e.id === detailJob.employerId) : null;

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = allApps.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  const confirmWithdraw = async () => {
    if (!withdrawId) return;
    try {
      await withdrawApplication(withdrawId);
      setWithdrawId(null);
      if (detailApp === withdrawId) setDetailApp(null);
      toastSuccess('Application withdrawn.');
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not withdraw.');
    }
  };

  const canWithdraw = (status: ApplicationStatus) => !['withdrawn', 'rejected'].includes(status);

  return (
    <div className="space-y-5">
      <SectionTitle title="My applications" subtitle={`${allApps.length} total · track status from Applied to Accepted`} />

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setStatusFilter('')}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${statusFilter === '' ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-brand-300'}`}
        >
          All ({allApps.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-brand-300'}`}
          >
            {APPLICATION_STATUS_LABELS[s]} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by job title or area" className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Frown className="h-7 w-7" />}
            title="No applications here"
            description={statusFilter ? `You have no ${APPLICATION_STATUS_LABELS[statusFilter]} applications.` : 'Apply to jobs and track them here.'}
            action={<Button onClick={() => navigate('/worker/jobs')}>Find work</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const job = db.jobs.find((j) => j.id === app.jobId);
            if (!job) return null;
            const employer = db.employerProfiles.find((e) => e.id === job.employerId);
            return (
              <Card key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:shadow-cardHover transition-shadow">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CategoryIcon category={job.category} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900 truncate">{job.title}</p>
                    <p className="text-xs text-ink-500 truncate">{employer?.businessName} · {job.area} · {formatDate(job.date)}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ApplicationStatusBadge status={app.status} />
                      <span className="text-xs text-ink-400">Updated {formatRelative(app.updatedAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-end sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-canvas-100">
                  <Button size="sm" variant="outline" onClick={() => setDetailApp(app.id)}>View</Button>
                  {canWithdraw(app.status) && (
                    <Button size="sm" variant="ghost" className="text-error-600 hover:bg-error-50" onClick={() => setWithdrawId(app.id)}>
                      Withdraw
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetailApp(null)}
        title="Application details"
        size="lg"
        footer={
          detail && canWithdraw(detail.status) ? (
            <>
              <Button variant="ghost" onClick={() => setDetailApp(null)}>Close</Button>
              <Button variant="danger" onClick={() => setWithdrawId(detail.id)}>Withdraw application</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setDetailApp(null)}>Close</Button>
          )
        }
      >
        {detail && detailJob && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <CategoryIcon category={detailJob.category} className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-ink-900">{detailJob.title}</h3>
                <p className="text-sm text-ink-500">{detailJob.area}, {detailJob.city} · {formatDate(detailJob.date)}</p>
                <div className="mt-2"><ApplicationStatusBadge status={detail.status} /></div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400">Pay</p>
                <p className="mt-0.5 font-bold text-brand-600">{formatINR(detailJob.payAmount)} {PAY_BASIS_LABELS[detailJob.payBasis]}</p>
              </div>
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400">Applied on</p>
                <p className="mt-0.5 font-semibold text-ink-800">{formatDate(detail.appliedAt)}</p>
              </div>
            </div>
            {detail.message && (
              <div className="rounded-xl bg-canvas-100 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400">Your message</p>
                <p className="mt-1 text-sm text-ink-700">{detail.message}</p>
              </div>
            )}
            {detailEmployer && (() => {
              const empUser = employerUserFor(db, detailEmployer.userId);
              return (
                <div className="rounded-xl border border-canvas-200 p-4">
                  <div className="flex items-center gap-3">
                    {empUser && (
                      <Avatar name={empUser.name} color={empUser.avatarColor} size="md" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-ink-900 truncate">{detailEmployer.businessName}</p>
                      <VerificationBadge state={detailEmployer.verification} size="sm" />
                    </div>
                    {detailEmployer.ratingCount > 0 && <StarRating value={detailEmployer.rating} count={detailEmployer.ratingCount} />}
                  </div>
                  {detailEmployer.description && (
                    <p className="mt-2 text-sm text-ink-600">{detailEmployer.description}</p>
                  )}
                </div>
              );
            })()}
            <Button variant="outline" fullWidth onClick={() => navigate(`/worker/jobs/${detailJob.id}`)}>
              View full job details
            </Button>
          </div>
        )}
      </Modal>

      {/* Withdraw confirm */}
      <Modal
        open={!!withdrawId}
        onClose={() => setWithdrawId(null)}
        title="Withdraw this application?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setWithdrawId(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmWithdraw}>Yes, withdraw</Button>
          </>
        }
      >
        <p className="text-sm text-ink-600">The employer will be notified that you withdrew. This cannot be undone, but you can reapply if the job is still open.</p>
      </Modal>
    </div>
  );
}

function employerUserFor(db: ReturnType<typeof useDB>, userId: string) {
  return db.users.find((u) => u.id === userId);
}
