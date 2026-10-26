import { useState } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Ban, Flag, ExternalLink, Inbox } from 'lucide-react';
import { useDB, getReports, setReportStatus } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/shared';

import { formatRelative } from '@/lib/utils';
import { toastError, toastSuccess } from '@/components/ui/Toast';

export function AdminModerationPage() {
  const db = useDB();
  const { navigate } = useRouter();
  const reports = getReports(db);
  const [confirm, setConfirm] = useState<{ reportId: string; action: 'dismiss' | 'suspend' } | null>(null);

  const [acting, setActing] = useState(false);

  const runConfirm = async () => {
    if (!confirm) return;
    setActing(true);
    try {
      await setReportStatus(confirm.reportId, confirm.action === 'dismiss' ? 'dismissed' : 'suspended');
      toastSuccess(confirm.action === 'dismiss' ? 'Report dismissed.' : 'Record suspended (demo).');
      setConfirm(null);
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Could not update report.');
    } finally {
      setActing(false);
    }
  };

  const resolveTarget = (r: typeof reports[number]) => {
    if (r.targetType === 'job') {
      const job = db.jobs.find((j) => j.id === r.targetId);
      const employer = job ? db.employerProfiles.find((e) => e.id === job.employerId) : undefined;
      return { label: job?.title ?? 'Unknown job', sub: employer ? `${employer.businessName} · ${job?.area}` : 'Job no longer exists', kind: 'job' as const, link: job ? `/worker/jobs/${job.id}` : undefined };
    }
    const user = db.users.find((u) => u.id === r.targetId);
    return { label: user?.name ?? 'Unknown user', sub: user ? user.role : 'User no longer exists', kind: 'user' as const, link: undefined };
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Demo moderation"
        subtitle="Reported jobs and users are reviewed here. This is a demo admin view."
        action={<Badge variant="neutral">{reports.filter((r) => r.status === 'open').length} open</Badge>}
      />

      <Card className="p-4 bg-brand-50/40 border-brand-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-brand-700 mt-0.5" />
          <p className="text-sm text-ink-700">
            In this prototype, moderation actions are limited to <strong>dismiss</strong> and <strong>suspend (demo)</strong>. Suspending a record marks its report status; it does not permanently hide content from the database. No real accounts are affected.
          </p>
        </div>
      </Card>

      {reports.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Inbox className="h-7 w-7" />}
            title="No reports yet"
            description="When a worker or employer reports a job or user, those reports appear here for review."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => {
            const target = resolveTarget(r);
            const reporter = db.users.find((u) => u.id === r.reporterUserId);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-50 text-error-600">
                    <Flag className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.status === 'open' ? 'error' : r.status === 'dismissed' ? 'neutral' : 'warning'} size="sm">
                        {r.status}
                      </Badge>
                      <Badge variant="neutral" size="sm">{target.kind}</Badge>
                      <span className="text-xs text-ink-400">{formatRelative(r.createdAt)}</span>
                    </div>
                    <p className="mt-1.5 font-bold text-ink-900">{target.label}</p>
                    <p className="text-xs text-ink-500">{target.sub}</p>
                    <div className="mt-2 rounded-lg bg-canvas-100 p-2.5 text-sm">
                      <p className="text-xs font-semibold uppercase text-ink-400">Reason: {r.reason}</p>
                      <p className="mt-0.5 text-ink-700">{r.details}</p>
                    </div>
                    {reporter && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                        <Avatar name={reporter.name} color={reporter.avatarColor} size="sm" /> Reported by {reporter.name}
                      </p>
                    )}
                  </div>
                </div>
                {r.status === 'open' && (
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-canvas-100 pt-3">
                    {target.link && (
                      <Button variant="ghost" size="sm" onClick={() => navigate(target.link!)} leftIcon={<ExternalLink className="h-4 w-4" />}>
                        View
                      </Button>
                    )}
                    <Button variant="outline" size="sm" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setConfirm({ reportId: r.id, action: 'dismiss' })}>
                      Dismiss
                    </Button>
                    <Button variant="danger" size="sm" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setConfirm({ reportId: r.id, action: 'suspend' })}>
                      Suspend (demo)
                    </Button>
                  </div>
                )}
                {r.status !== 'open' && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-ink-500 border-t border-canvas-100 pt-3">
                    <CheckCircle2 className="h-4 w-4 text-ink-400" /> Reviewed — marked {r.status}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.action === 'dismiss' ? 'Dismiss this report?' : 'Suspend this record (demo)?'}
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button><Button variant={confirm?.action === 'suspend' ? 'danger' : 'primary'} onClick={runConfirm} disabled={acting}>{confirm?.action === 'dismiss' ? 'Dismiss' : 'Suspend'}</Button></>}
      >
        <p className="text-sm text-ink-600">
          {confirm?.action === 'dismiss'
            ? 'The report will be closed with no action taken. The reporter will be notified.'
            : 'The record will be marked as suspended in demo mode. The reporter will be notified. No real account is affected.'}
        </p>
      </Modal>
    </div>
  );
}
