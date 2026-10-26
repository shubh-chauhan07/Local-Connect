import { ArrowRight, Briefcase, Bookmark, FileText, TrendingUp } from 'lucide-react';
import { useDB, useSession, getApplicationsForWorker, getSavedJobsForWorker, isJobSaved } from '@/data/store';
import { useRouter, linkProps } from '@/lib/router';
import { JobCard } from '@/components/JobCard';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, ApplicationStatusBadge, CategoryIcon } from '@/components/shared';
import { formatDate, formatRelative } from '@/lib/utils';

export function WorkerDashboard() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const workerUserId = session.userId!;
  const user = db.users.find((u) => u.id === workerUserId)!;
  const profile = db.workerProfiles.find((w) => w.userId === workerUserId)!;

  const myApps = getApplicationsForWorker(db, workerUserId);
  const saved = getSavedJobsForWorker(db, workerUserId);
  const upcoming = myApps
    .filter((a) => a.status === 'accepted')
    .map((a) => db.jobs.find((j) => j.id === a.jobId))
    .filter(Boolean)
    .filter((j) => new Date(j!.date) >= new Date())
    .sort((a, b) => a!.date.localeCompare(b!.date));

  const nearby = db.jobs
    .filter((j) => j.status === 'published' && profile.areas.some((a) => j.area.includes(a)))
    .slice(0, 6);
  const recommended = db.jobs
    .filter((j) => j.status === 'published' && j.requiredSkills.some((s) => profile.skills.includes(s)))
    .slice(0, 3);
  const fillRest = db.jobs.filter((j) => j.status === 'published' && !recommended.includes(j)).slice(0, 3 - recommended.length);
  const recommendedFinal = [...recommended, ...fillRest].slice(0, 3);

  const statusCounts = {
    applied: myApps.filter((a) => a.status === 'applied').length,
    shortlisted: myApps.filter((a) => a.status === 'shortlisted').length,
    accepted: myApps.filter((a) => a.status === 'accepted').length,
    rejected: myApps.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 to-teal-600 p-6 text-white">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} color={user.avatarColor} size="lg" />
            <div>
              <p className="text-brand-50/90 text-sm">Welcome back,</p>
              <h1 className="text-2xl font-extrabold font-display">{user.name}</h1>
              <p className="mt-0.5 text-sm text-brand-50/80">{profile.preferredArea} · {profile.completedJobs} jobs completed</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Applied" value={statusCounts.applied} />
            <Stat label="Shortlisted" value={statusCounts.shortlisted} />
            <Stat label="Accepted" value={statusCounts.accepted} />
            <Stat label="Saved" value={saved.length} />
          </div>
        </div>
      </Card>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction icon={<Briefcase className="h-5 w-5" />} label="Find work" to="/worker/jobs" navigate={navigate} />
        <QuickAction icon={<FileText className="h-5 w-5" />} label="My applications" to="/worker/applications" navigate={navigate} />
        <QuickAction icon={<Bookmark className="h-5 w-5" />} label="Saved jobs" to="/worker/saved" navigate={navigate} />
        <QuickAction icon={<TrendingUp className="h-5 w-5" />} label="Edit profile" to="/worker/profile" navigate={navigate} />
      </div>

      {/* Upcoming work */}
      {upcoming.length > 0 && (
        <div>
          <SectionTitle title="Upcoming work" subtitle="Accepted jobs coming up soon" />
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            {upcoming.map((job) => {
              const employer = db.employerProfiles.find((e) => e.id === job!.employerId);
              return (
                <Card key={job!.id} className="p-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CategoryIcon category={job!.category} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-900 truncate">{job!.title}</p>
                    <p className="text-xs text-ink-500">{employer?.businessName} · {formatDate(job!.date)}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/worker/jobs/${job!.id}`)}>
                    Details
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommended jobs */}
      <div>
        <SectionTitle
          title="Recommended for you"
          subtitle="Based on your skills and preferred areas"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/worker/jobs')} rightIcon={<ArrowRight className="h-4 w-4" />}>See all</Button>}
        />
        <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {recommendedFinal.map((job) => (
            <JobCard
              key={job!.id}
              job={job!}
              db={db}
              saved={isJobSaved(db, workerUserId, job!.id)}
              onToggleSave={() => navigate(`/worker/jobs/${job!.id}`)}
              onOpen={() => navigate(`/worker/jobs/${job!.id}`)}
            />
          ))}
        </div>
      </div>

      {/* Nearby jobs */}
      <div>
        <SectionTitle
          title="Nearby jobs"
          subtitle={`Open now in ${profile.areas.join(', ') || 'Ahmedabad'}`}
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/worker/jobs')} rightIcon={<ArrowRight className="h-4 w-4" />}>See all</Button>}
        />
        {nearby.length === 0 ? (
          <Card><EmptyState icon={<Briefcase className="h-7 w-7" />} title="No jobs in your preferred areas right now" description="Try expanding your preferred areas in your profile." /></Card>
        ) : (
          <div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {nearby.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                db={db}
                saved={isJobSaved(db, workerUserId, job.id)}
                onToggleSave={() => navigate(`/worker/jobs/${job.id}`)}
                onOpen={() => navigate(`/worker/jobs/${job.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent applications */}
      <div>
        <SectionTitle
          title="Recent applications"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/worker/applications')} rightIcon={<ArrowRight className="h-4 w-4" />}>View all</Button>}
        />
        {myApps.length === 0 ? (
          <Card><EmptyState icon={<FileText className="h-7 w-7" />} title="No applications yet" description="Apply to jobs and they will show up here with live status." action={<Button onClick={() => navigate('/worker/jobs')}>Find work</Button>} /></Card>
        ) : (
          <Card className="divide-y divide-canvas-100">
            {myApps.slice(0, 4).map((app) => {
              const job = db.jobs.find((j) => j.id === app.jobId);
              if (!job) return null;
              const employer = db.employerProfiles.find((e) => e.id === job.employerId);
              return (
                <a key={app.id} {...linkProps(`/worker/applications`, navigate)} className="flex items-center gap-3 p-4 hover:bg-canvas-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <CategoryIcon category={job.category} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 truncate">{job.title}</p>
                    <p className="text-xs text-ink-500">{employer?.businessName} · applied {formatRelative(app.appliedAt)}</p>
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
    <div className="rounded-xl bg-white/15 backdrop-blur p-3">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-brand-50/80">{label}</p>
    </div>
  );
}

function QuickAction({ icon, label, to, navigate }: { icon: React.ReactNode; label: string; to: string; navigate: (t: string) => void }) {
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-3 rounded-2xl bg-white border border-canvas-200 p-4 hover:border-brand-200 hover:shadow-card transition-all text-left"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
      <span className="text-sm font-semibold text-ink-800">{label}</span>
    </button>
  );
}
