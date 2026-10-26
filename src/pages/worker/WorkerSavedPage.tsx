import { Bookmark } from 'lucide-react';
import { useDB, useSession, getSavedJobsForWorker, removeSavedJob } from '@/data/store';
import { useRouter } from '@/lib/router';
import { JobCard } from '@/components/JobCard';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toastSuccess } from '@/components/ui/Toast';

export function WorkerSavedPage() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const workerUserId = session.userId!;
  const saved = getSavedJobsForWorker(db, workerUserId);

  return (
    <div className="space-y-5">
      <SectionTitle title="Saved jobs" subtitle={`${saved.length} saved · apply or remove anytime`} />

      {saved.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bookmark className="h-7 w-7" />}
            title="No saved jobs yet"
            description="Tap the bookmark icon on any job to save it for later."
            action={<Button onClick={() => navigate('/worker/jobs')}>Find work</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {saved.map((s) => {
            const job = db.jobs.find((j) => j.id === s.jobId);
            if (!job) return null;
            return (
              <div key={s.id} className="relative">
                <JobCard
                  job={job}
                  db={db}
                  saved
                  onToggleSave={() => { void removeSavedJob(s.id); toastSuccess('Removed from saved'); }}
                  onOpen={() => navigate(`/worker/jobs/${job.id}`)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
