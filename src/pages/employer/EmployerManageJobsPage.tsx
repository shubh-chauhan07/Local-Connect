import { useState } from 'react';
import { PlusCircle, Users, Pause, Play, CheckCircle2, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useDB, useSession, setJobStatus, deleteJob } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { JobStatusBadge, CategoryIcon } from '@/components/shared';
import { JOB_STATUS_LABELS, PAY_BASIS_LABELS, type JobStatus } from '@/types';
import { formatINR, formatDate } from '@/lib/utils';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const STATUS_FILTERS: (JobStatus | 'all')[] = ['all', 'published', 'draft', 'paused', 'completed'];

export function EmployerManageJobsPage() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const userId = session.userId!;
  const [filter, setFilter] = useState<JobStatus | 'all'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: string; jobId: string; title: string } | null>(null);

  const myJobs = db.jobs.filter((j) => j.employerUserId === userId);
  const filtered = filter === 'all' ? myJobs : myJobs.filter((j) => j.status === filter);

  const counts = STATUS_FILTERS.reduce((acc, s) => {
    acc[s] = s === 'all' ? myJobs.length : myJobs.filter((j) => j.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const [acting, setActing] = useState(false);

  const runConfirm = async () => {
    if (!confirm) return;
    const { type, jobId } = confirm;
    setActing(true);
    try {
      if (type === 'pause') { await setJobStatus(jobId, 'paused'); toastSuccess('Job paused. It is hidden from workers.'); }
      else if (type === 'publish') { await setJobStatus(jobId, 'published'); toastSuccess('Job published. Workers can apply now.'); }
      else if (type === 'complete') { await setJobStatus(jobId, 'completed'); toastSuccess('Job marked completed.'); }
      else if (type === 'delete') { await deleteJob(jobId); toastSuccess('Job deleted.'); }
      setConfirm(null);
      setMenuOpen(null);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not perform action.');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Manage jobs"
        subtitle={`${myJobs.length} job${myJobs.length === 1 ? '' : 's'} total`}
        action={<Button leftIcon={<PlusCircle className="h-4 w-4" />} onClick={() => navigate('/employer/jobs/new')}>Post a job</Button>}
      />

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${filter === s ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 ring-1 ring-inset ring-ink-200 hover:ring-brand-300'}`}
          >
            {s === 'all' ? 'All' : JOB_STATUS_LABELS[s as JobStatus]} ({counts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PlusCircle className="h-7 w-7" />}
            title={filter === 'all' ? 'No jobs yet' : `No ${JOB_STATUS_LABELS[filter as JobStatus] ?? filter} jobs`}
            description="Post your first job to start receiving applications from local workers."
            action={<Button onClick={() => navigate('/employer/jobs/new')}>Post a job</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => {
            const apps = db.applications.filter((a) => a.jobId === job.id);
            const pending = apps.filter((a) => a.status === 'applied').length;
            return (
              <Card key={job.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CategoryIcon category={job.category} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-ink-900 truncate">{job.title}</h3>
                      <JobStatusBadge status={job.status} />
                    </div>
                    <p className="text-xs text-ink-500 mt-0.5">{job.area} · {formatDate(job.date)} · {formatINR(job.payAmount)} {PAY_BASIS_LABELS[job.payBasis]}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 text-ink-600"><Users className="h-3.5 w-3.5 text-ink-400" />{job.applicantsCount} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                      {pending > 0 && <Badge variant="warning" size="sm">{pending} new</Badge>}
                    </div>
                  </div>

                  <div className="relative shrink-0">
                    <Button variant="ghost" size="icon" aria-label="Actions" onClick={() => setMenuOpen(menuOpen === job.id ? null : job.id)}>
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                    {menuOpen === job.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                        <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-canvas-200 bg-white p-1.5 shadow-pop animate-scaleIn">
                          <MenuItem icon={<Users className="h-4 w-4" />} label="View applicants" onClick={() => { navigate('/employer/applicants'); setMenuOpen(null); }} />
                          <MenuItem icon={<Pencil className="h-4 w-4" />} label="Edit job" onClick={() => { navigate(`/employer/jobs/${job.id}/edit`); setMenuOpen(null); }} />
                          {job.status === 'published' && <MenuItem icon={<Pause className="h-4 w-4" />} label="Pause" onClick={() => setConfirm({ type: 'pause', jobId: job.id, title: job.title })} />}
                          {job.status === 'paused' && <MenuItem icon={<Play className="h-4 w-4" />} label="Reopen" onClick={() => setConfirm({ type: 'publish', jobId: job.id, title: job.title })} />}
                          {job.status !== 'completed' && <MenuItem icon={<CheckCircle2 className="h-4 w-4" />} label="Mark completed" onClick={() => setConfirm({ type: 'complete', jobId: job.id, title: job.title })} />}
                          {job.status === 'draft' && <MenuItem icon={<Play className="h-4 w-4" />} label="Publish" onClick={() => setConfirm({ type: 'publish', jobId: job.id, title: job.title })} />}
                          <div className="my-1 h-px bg-canvas-100" />
                          <MenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete" danger onClick={() => setConfirm({ type: 'delete', jobId: job.id, title: job.title })} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'delete' ? 'Delete this job?' : 'Confirm action'}
        description={confirm?.title}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.type === 'delete' ? 'danger' : 'primary'} onClick={runConfirm} disabled={acting}>{confirm?.type === 'delete' ? 'Delete' : 'Confirm'}</Button></>}
      >
        <p className="text-sm text-ink-600">
          {confirm?.type === 'delete' && 'This permanently removes the job and all its applications. This cannot be undone.'}
          {confirm?.type === 'pause' && 'The job will be hidden from job search. You can reopen it anytime.'}
          {confirm?.type === 'publish' && 'The job will become visible to workers and open for applications.'}
          {confirm?.type === 'complete' && 'The job will be marked as completed. Accepted workers will be notified.'}
        </p>
      </Modal>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${danger ? 'text-error-600 hover:bg-error-50' : 'text-ink-700 hover:bg-canvas-100'}`}
    >
      {icon}{label}
    </button>
  );
}
