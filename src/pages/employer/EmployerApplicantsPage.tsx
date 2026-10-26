import { useEffect, useMemo, useState } from 'react';
import { Frown, Star, Phone, MapPin, Briefcase, Flag } from 'lucide-react';
import {
  useDB, useSession, getApplicationsForEmployer, getAuthorizedProfilePhone, setApplicationStatus,
} from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Field';
import { Avatar, ApplicationStatusBadge, VerificationBadge, StarRating } from '@/components/shared';
import { useReportDialog } from '@/components/ReportDialog';
import { APPLICATION_STATUS_LABELS, CATEGORY_LABELS, type ApplicationStatus } from '@/types';
import { formatRelative } from '@/lib/utils';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const STATUSES: ApplicationStatus[] = ['applied', 'reviewed', 'shortlisted', 'accepted', 'rejected'];

export function EmployerApplicantsPage() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const userId = session.userId!;
  const report = useReportDialog(userId);

  const allApps = getApplicationsForEmployer(db, userId);
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [detailApp, setDetailApp] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ appId: string; status: ApplicationStatus } | null>(null);

  const myJobs = db.jobs.filter((j) => j.employerUserId === userId);

  const filtered = useMemo(() => {
    let list = allApps;
    if (jobFilter !== 'all') list = list.filter((a) => a.jobId === jobFilter);
    if (statusFilter) list = list.filter((a) => a.status === statusFilter);
    return list;
  }, [allApps, jobFilter, statusFilter]);

  const detail = detailApp ? allApps.find((a) => a.id === detailApp) : null;
  const detailJob = detail ? db.jobs.find((j) => j.id === detail.jobId) : null;
  const detailWorker = detail ? db.users.find((u) => u.id === detail.workerUserId) : null;
  const detailProfile = detail ? db.workerProfiles.find((w) => w.userId === detail.workerUserId) : null;
  const detailStatus = detail?.status;
  const detailWorkerId = detailWorker?.id;
  const [acceptedPhone, setAcceptedPhone] = useState('');

  useEffect(() => {
    setAcceptedPhone('');
    if (detailStatus !== 'accepted' || !detailWorkerId) return;

    let cancelled = false;
    getAuthorizedProfilePhone(detailWorkerId)
      .then((phone) => {
        if (!cancelled) setAcceptedPhone(phone ?? '');
      })
      .catch((error: unknown) => {
        if (!cancelled) toastError(error instanceof Error ? error.message : 'Could not load contact details.');
      });
    return () => { cancelled = true; };
  }, [detailStatus, detailWorkerId]);

  const [acting, setActing] = useState(false);

  const runConfirm = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      await setApplicationStatus(confirm.appId, confirm.status);
      toastSuccess(`Application marked ${APPLICATION_STATUS_LABELS[confirm.status]}.`);
      setConfirm(null);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not update application.');
    } finally {
      setActing(false);
    }
  };

  const actionButton = (status: ApplicationStatus, current: ApplicationStatus) => {
    if (current === status) return null;
    const labels: Record<ApplicationStatus, string> = {
      applied: 'Mark applied',
      reviewed: 'Mark reviewed',
      shortlisted: 'Shortlist',
      accepted: 'Accept',
      rejected: 'Reject',
      withdrawn: 'Withdrawn',
    };
    const variants: Record<ApplicationStatus, 'outline' | 'primary' | 'danger' | 'subtle' | 'ghost'> = {
      applied: 'ghost',
      reviewed: 'outline',
      shortlisted: 'subtle',
      accepted: 'primary',
      rejected: 'danger',
      withdrawn: 'ghost',
    };
    return (
      <Button
        key={status}
        size="sm"
        variant={variants[status]}
        onClick={() => setConfirm({ appId: detail!.id, status })}
      >
        {labels[status]}
      </Button>
    );
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Applicants" subtitle={`${allApps.length} application${allApps.length === 1 ? '' : 's'} across your jobs`} />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <label className="text-xs font-semibold text-ink-600">Job</label>
          <Select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="mt-1">
            <option value="all">All jobs</option>
            {myJobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </Select>
        </div>
        <div className="w-full sm:w-44">
          <label className="text-xs font-semibold text-ink-600">Status</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')} className="mt-1">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{APPLICATION_STATUS_LABELS[s]}</option>)}
            <option value="withdrawn">Withdrawn</option>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Frown className="h-7 w-7" />}
            title="No applications match"
            description="When workers apply to your jobs, they'll show up here for review."
            action={<Button variant="outline" onClick={() => navigate('/employer/jobs/new')}>Post a job</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => {
            const worker = db.users.find((u) => u.id === app.workerUserId);
            const profile = db.workerProfiles.find((w) => w.userId === app.workerUserId);
            const job = db.jobs.find((j) => j.id === app.jobId);
            if (!worker || !job) return null;
            return (
              <Card key={app.id} className="p-4 flex items-center gap-4">
                <Avatar name={worker.name} color={worker.avatarColor} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-ink-900 truncate">{worker.name}</p>
                    <VerificationBadge state={worker.verification} size="sm" />
                  </div>
                  <p className="text-xs text-ink-500 truncate">for {job.title} · applied {formatRelative(app.appliedAt)}</p>
                  <div className="mt-1 flex items-center gap-2 sm:hidden">
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                  {profile && profile.skills.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.skills.slice(0, 3).map((s) => <Badge key={s} variant="neutral" size="sm">{s}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block"><ApplicationStatusBadge status={app.status} /></div>
                <Button size="sm" variant="outline" onClick={() => setDetailApp(app.id)}>Review</Button>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetailApp(null)}
        title="Applicant review"
        size="lg"
        footer={
          detail && detail.status !== 'withdrawn' ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDetailApp(null)}>Close</Button>
              {STATUSES.filter((s) => s !== 'applied').map((s) => actionButton(s, detail.status))}
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setDetailApp(null)}>Close</Button>
          )
        }
      >
        {detail && detailJob && detailWorker && detailProfile && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Avatar name={detailWorker.name} color={detailWorker.avatarColor} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-ink-900">{detailWorker.name}</h3>
                  <VerificationBadge state={detailWorker.verification} size="sm" />
                </div>
                <p className="text-sm text-ink-500">Applied to {detailJob.title} · {formatRelative(detail.appliedAt)}</p>
                <div className="mt-2"><ApplicationStatusBadge status={detail.status} /></div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => report.openFor('user', detailWorker.id, detailWorker.name)} leftIcon={<Flag className="h-4 w-4 text-ink-400" />}>Report</Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400 flex items-center gap-1"><MapPin className="h-3 w-3" />Preferred area</p>
                <p className="mt-0.5 font-semibold text-ink-800">{detailProfile.preferredArea}</p>
              </div>
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400 flex items-center gap-1"><Briefcase className="h-3 w-3" />Experience</p>
                <p className="mt-0.5 font-semibold text-ink-800">{detailProfile.experienceYears} year{detailProfile.experienceYears !== 1 ? 's' : ''} · {detailProfile.completedJobs} jobs done</p>
              </div>
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400 flex items-center gap-1"><Star className="h-3 w-3" />Rating</p>
                <p className="mt-0.5"><StarRating value={detailProfile.rating} count={detailProfile.ratingCount} /></p>
              </div>
              <div className="rounded-xl border border-canvas-200 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400 flex items-center gap-1"><Phone className="h-3 w-3" />Phone</p>
                <p className="mt-0.5 font-semibold text-ink-800">
                  {detail.status === 'accepted' ? acceptedPhone || 'Contact unavailable' : 'Available after acceptance'}
                </p>
                {detail.status !== 'accepted' && (
                  <p className="mt-0.5 text-[11px] text-ink-400">Contact only after you accept.</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-ink-400">Skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {detailProfile.skills.length ? detailProfile.skills.map((s) => <Badge key={s} variant="brand" size="sm">{s}</Badge>) : <span className="text-sm text-ink-400">No skills listed.</span>}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-ink-400">Availability</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {detailProfile.availability.length ? detailProfile.availability.map((a) => <Badge key={a} variant="teal" size="sm">{a}</Badge>) : <span className="text-sm text-ink-400">Not specified.</span>}
              </div>
            </div>

            {detail.message && (
              <div className="rounded-xl bg-canvas-100 p-3">
                <p className="text-xs font-semibold uppercase text-ink-400">Message from applicant</p>
                <p className="mt-1 text-sm text-ink-700">{detail.message}</p>
              </div>
            )}

            {/* Work history */}
            {detailProfile.workHistory.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-ink-400">Work history</p>
                <div className="mt-2 space-y-2">
                  {detailProfile.workHistory.map((w) => (
                    <div key={w.id} className="rounded-lg border border-canvas-100 p-2.5">
                      <p className="text-sm font-semibold text-ink-800">{w.jobTitle}</p>
                      <p className="text-xs text-ink-500">{w.employerName} · {CATEGORY_LABELS[w.category]}</p>
                      <div className="mt-1 flex items-center gap-2"><StarRating value={w.rating} size="sm" /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Confirm status change */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={`${confirm ? APPLICATION_STATUS_LABELS[confirm.status] : ''} this applicant?`}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.status === 'rejected' ? 'danger' : 'primary'} onClick={runConfirm} disabled={acting}>Yes, {confirm ? APPLICATION_STATUS_LABELS[confirm.status].toLowerCase() : ''}</Button></>}
      >
        <p className="text-sm text-ink-600">
          {confirm?.status === 'accepted' && 'The worker will be notified they are accepted for this job. Contact details will be shared.'}
          {confirm?.status === 'rejected' && 'The worker will be notified they were not selected for this job.'}
          {confirm?.status === 'shortlisted' && 'The worker will be notified they are shortlisted.'}
          {confirm?.status === 'reviewed' && 'Marks the application as reviewed (no notification to the worker).'}
        </p>
      </Modal>

      {report.dialog}
    </div>
  );
}
