import { Briefcase, Users, FileText, PlusCircle, AlertCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { useDB, useSession, getApplicationsForEmployer } from '@/data/store';
import { useRouter, linkProps } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

import { JobStatusBadge, CategoryIcon, ApplicationStatusBadge, Avatar, VerificationBadge, StarRating } from '@/components/shared';
import { PAY_BASIS_LABELS } from '@/types';
import { formatRelative, formatDate, formatINR } from '@/lib/utils';

export function EmployerDashboard() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const userId = session.userId ?? '';
  const user = db.users.find((u) => u.id === userId);
  const profile = db.employerProfiles.find((e) => e.userId === userId);

  if (!user || !profile) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-ink-900">Setting up employer dashboard...</h2>
        <p className="mt-2 text-sm text-ink-500">Retrieving your business information.</p>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => navigate('/employer/profile')}>Go to Profile</Button>
        </div>
      </Card>
    );
  }

  const myJobs = db.jobs.filter((j) => j.employerUserId === userId);
  const activeJobs = myJobs.filter((j) => j.status === 'published');
  const draftJobs = myJobs.filter((j) => j.status === 'draft');
  const pausedJobs = myJobs.filter((j) => j.status === 'paused');
  const allApps = getApplicationsForEmployer(db, userId);
  const recentApps = allApps.slice(0, 5);
  const needsAttention = activeJobs.filter((j) => j.applicantsCount > 0).map((j) => {
    const apps = db.applications.filter((a) => a.jobId === j.id);
    const pending = apps.filter((a) => a.status === 'applied').length;
    return { job: j, pending };
  }).filter((x) => x.pending > 0).slice(0, 4);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-ink-900 to-ink-800 p-5 sm:p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} color={user.avatarColor} size="lg" className="shrink-0" />
            <div className="min-w-0">
              <p className="text-ink-300 text-sm">Employer dashboard</p>
              <h1 className="text-xl sm:text-2xl font-extrabold font-display truncate">{profile.businessName}</h1>
              <div className="mt-1 flex items-center gap-2">
                <VerificationBadge state={profile.verification} size="sm" />
                {profile.ratingCount > 0 && <StarRating value={profile.rating} count={profile.ratingCount} />}
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Active jobs" value={activeJobs.length} />
            <Stat label="Applicants" value={allApps.length} />
            <Stat label="Drafts" value={draftJobs.length} />
            <Stat label="Paused" value={pausedJobs.length} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon={<PlusCircle className="h-5 w-5" />} label="Post a job" to="/employer/jobs/new" navigate={navigate} primary />
        <QuickAction icon={<Briefcase className="h-5 w-5" />} label="Manage jobs" to="/employer/jobs" navigate={navigate} />
        <QuickAction icon={<Users className="h-5 w-5" />} label="Applicants" to="/employer/applicants" navigate={navigate} />
        <QuickAction icon={<TrendingUp className="h-5 w-5" />} label="Edit profile" to="/employer/profile" navigate={navigate} />
      </div>

      {/* Needs attention */}
      {needsAttention.length > 0 && (
        <div>
          <SectionTitle title="Needs your attention" subtitle="Jobs with new applicants waiting" />
          <div className="mt-3 space-y-3">
            {needsAttention.map(({ job, pending }) => (
              <Card key={job.id} className="p-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink-900 truncate">{job.title}</p>
                  <p className="text-xs text-ink-500">{pending} new applicant{pending > 1 ? 's' : ''} · {formatDate(job.date)}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/employer/applicants')}>Review</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active jobs */}
      <div>
        <SectionTitle
          title="Active jobs"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/employer/jobs')} rightIcon={<ArrowRight className="h-4 w-4" />}>Manage all</Button>}
        />
        {activeJobs.length === 0 ? (
          <Card><EmptyState icon={<Briefcase className="h-7 w-7" />} title="No active jobs" description="Post your first job to start receiving applications." action={<Button onClick={() => navigate('/employer/jobs/new')}>Post a job</Button>} /></Card>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeJobs.slice(0, 4).map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><CategoryIcon category={job.category} className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900 truncate">{job.title}</p>
                    <p className="text-xs text-ink-500">{job.area} · {formatDate(job.date)}</p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-ink-600"><Users className="inline h-4 w-4 mr-1 text-ink-400" />{job.applicantsCount} applicant{job.applicantsCount !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-brand-600">{formatINR(job.payAmount)} <span className="text-xs text-ink-400">{PAY_BASIS_LABELS[job.payBasis]}</span></span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent applications */}
      <div>
        <SectionTitle title="Recent applications" action={<Button variant="ghost" size="sm" onClick={() => navigate('/employer/applicants')} rightIcon={<ArrowRight className="h-4 w-4" />}>View all</Button>} />
        {recentApps.length === 0 ? (
          <Card><EmptyState icon={<FileText className="h-7 w-7" />} title="No applications yet" description="Once workers apply to your jobs, you'll see them here." /></Card>
        ) : (
          <Card className="divide-y divide-canvas-100">
            {recentApps.map((app) => {
              const worker = db.users.find((u) => u.id === app.workerUserId);
              const job = db.jobs.find((j) => j.id === app.jobId);
              if (!worker || !job) return null;
              return (
                <a key={app.id} {...linkProps('/employer/applicants', navigate)} className="flex items-center gap-3 p-4 hover:bg-canvas-50 transition-colors">
                  <Avatar name={worker.name} color={worker.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 truncate">{worker.name}</p>
                    <p className="text-xs text-ink-500 truncate">applied to {job.title} · {formatRelative(app.appliedAt)}</p>
                  </div>
                  <ApplicationStatusBadge status={app.status} />
                </a>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 p-3">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-ink-300">{label}</p>
    </div>
  );
}

function QuickAction({ icon, label, to, navigate, primary }: { icon: React.ReactNode; label: string; to: string; navigate: (t: string) => void; primary?: boolean }) {
  return (
    <button
      onClick={() => navigate(to)}
      className={`flex items-center gap-3 rounded-2xl p-4 transition-all text-left ${primary ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-white border border-canvas-200 text-ink-800 hover:border-brand-200 hover:shadow-card'}`}
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${primary ? 'bg-white/20' : 'bg-brand-50 text-brand-600'}`}>{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
