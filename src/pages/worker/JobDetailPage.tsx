import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft, MapPin, Calendar, Clock, Wallet, IndianRupee, Users, CheckCircle2,
  Phone, MessageCircle, Mail, Bookmark, BookmarkCheck, Flag, ShieldCheck, Star, Briefcase,
} from 'lucide-react';
import { useDB, useSession, isJobSaved, toggleSaveJob, applyToJob, getApplicationsForWorker, getReviewsForTarget, getAuthorizedProfilePhone } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea, FieldWrap } from '@/components/ui/Field';
import { CategoryIcon, VerificationBadge, StarRating, Avatar, ApplicationStatusBadge } from '@/components/shared';
import { useReportDialog } from '@/components/ReportDialog';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import {
  CATEGORY_LABELS, PAY_BASIS_LABELS, PAYMENT_TIMING_LABELS, PAYMENT_METHOD_LABELS,
  EMPLOYMENT_TYPE_LABELS, CONTACT_PREF_LABELS,
} from '@/types';
import { formatINR, formatDate, shiftDuration, timeTo12h } from '@/lib/utils';

export function JobDetailPage({ jobId, publicMode = false }: { jobId: string; publicMode?: boolean }) {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const [applyOpen, setApplyOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const report = useReportDialog(session.userId);
  const workerUserId = session.role === 'worker' ? session.userId : null;
  const jobsPath = publicMode ? '/jobs' : '/worker/jobs';

  const job = db.jobs.find((j) => j.id === jobId);
  const employer = job ? db.employerProfiles.find((e) => e.id === job.employerId) : undefined;
  const employerUser = employer ? db.users.find((u) => u.id === employer.userId) : undefined;
  const myApplication = job && workerUserId
    ? getApplicationsForWorker(db, workerUserId).find((a) => a.jobId === job.id)
    : undefined;
  const employerUserId = employer?.userId;
  const applicationStatus = myApplication?.status;
  const [employerPhone, setEmployerPhone] = useState('');

  useEffect(() => {
    setEmployerPhone('');
    if (applicationStatus !== 'accepted' || !employerUserId) return;

    let cancelled = false;
    getAuthorizedProfilePhone(employerUserId)
      .then((phone) => {
        if (!cancelled) setEmployerPhone(phone ?? '');
      })
      .catch((error: unknown) => {
        if (!cancelled) toastError(error instanceof Error ? error.message : 'Could not load contact details.');
      });
    return () => { cancelled = true; };
  }, [applicationStatus, employerUserId]);

  if (!job) {
    return (
      <Card className="p-8 text-center">
        <p className="text-ink-600">This job is no longer available.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate(jobsPath)}>
          Back to jobs
        </Button>
      </Card>
    );
  }

  const saved = workerUserId ? isJobSaved(db, workerUserId, job.id) : false;
  const reviews = employer ? getReviewsForTarget(db, 'employer', employer.id) : [];

  const onSave = async () => {
    if (!workerUserId) {
      navigate(`/login?next=${encodeURIComponent(`${publicMode ? '/jobs' : '/worker/jobs'}/${job.id}`)}`);
      return;
    }
    const wasSaved = isJobSaved(db, workerUserId, job.id);
    try {
      await toggleSaveJob(workerUserId, job.id);
      toastSuccess(wasSaved ? 'Removed from saved' : 'Job saved');
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Could not update saved jobs.');
    }
  };

  const submitApply = async () => {
    if (!workerUserId) {
      navigate(`/login?next=${encodeURIComponent(`${publicMode ? '/jobs' : '/worker/jobs'}/${job.id}`)}`);
      return;
    }
    const res = await applyToJob(job.id, workerUserId, message.trim());
    if (!res.ok) {
      setApplyError(res.error ?? 'Could not apply.');
      toastError(res.error ?? 'Could not apply.');
      return;
    }
    toastSuccess('Application submitted! Track it in My Applications.');
    setApplyOpen(false);
    setMessage('');
    setApplyError(null);
  };

  const contactIcon = {
    call: <Phone className="h-4 w-4" />,
    whatsapp: <MessageCircle className="h-4 w-4" />,
    app_message: <MessageCircle className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
  }[job.contactPreference];

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(jobsPath)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <CategoryIcon category={job.category} className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="teal" size="sm">{CATEGORY_LABELS[job.category]}</Badge>
                  <Badge variant="neutral" size="sm">{EMPLOYMENT_TYPE_LABELS[job.employmentType]}</Badge>
                  {myApplication && <ApplicationStatusBadge status={myApplication.status} />}
                </div>
                <h1 className="mt-2 text-2xl font-extrabold font-display text-ink-900">{job.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-ink-400" />{job.location}, {job.area}</span>
                  <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-ink-400" />{job.workersNeeded} worker{job.workersNeeded > 1 ? 's' : ''} needed</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoTile icon={<Calendar className="h-4 w-4" />} label="Date" value={formatDate(job.date)} />
              <InfoTile icon={<Clock className="h-4 w-4" />} label="Shift" value={`${timeTo12h(job.startTime)} – ${timeTo12h(job.endTime)} · ${shiftDuration(job.startTime, job.endTime)}`} />
              <InfoTile icon={<IndianRupee className="h-4 w-4" />} label="Pay" value={`${formatINR(job.payAmount)} ${PAY_BASIS_LABELS[job.payBasis]}`} highlight />
              <InfoTile icon={<Wallet className="h-4 w-4" />} label="Payment" value={`${PAYMENT_TIMING_LABELS[job.paymentTiming]} · ${PAYMENT_METHOD_LABELS[job.paymentMethod]}`} />
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Description</h2>
              <p className="mt-2 text-sm text-ink-700 leading-relaxed">{job.description}</p>
            </div>

            <div className="mt-6">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Responsibilities</h2>
              <ul className="mt-2 space-y-1.5">
                {job.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Required skills</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.requiredSkills.map((s) => (
                    <Badge key={s} variant="neutral" size="sm">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Requirements</h2>
                <ul className="mt-2 space-y-1.5">
                  {job.requirements.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {job.benefits.length > 0 && (
              <div className="mt-6 rounded-xl bg-brand-50/60 p-4">
                <h2 className="text-sm font-bold text-brand-700">Benefits</h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {job.benefits.map((b) => (
                    <Badge key={b} variant="brand" size="sm">{b}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Map placeholder */}
            <div className="mt-6 rounded-xl border border-canvas-200 bg-canvas-100/50 p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-brand-600" />
              <div className="text-sm">
                <p className="font-semibold text-ink-800">{job.location}</p>
                <p className="text-ink-500">{job.area}, {job.city} — map placeholder (no live map integration)</p>
              </div>
            </div>
          </Card>

          {/* Actions row (sticky on mobile) */}
          <Card className="p-4 sticky bottom-20 lg:static lg:bottom-auto">
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="icon" onClick={onSave} aria-label={saved ? 'Unsave' : 'Save'} className="shrink-0">
                {saved ? <BookmarkCheck className="h-5 w-5 text-brand-600" /> : <Bookmark className="h-5 w-5" />}
              </Button>
              <Button
                variant="outline"
                onClick={() => session.userId
                  ? report.openFor('job', job.id, job.title)
                  : navigate(`/login?next=${encodeURIComponent(`${publicMode ? '/jobs' : '/worker/jobs'}/${job.id}`)}`)}
                leftIcon={<Flag className="h-4 w-4" />}
                className="shrink-0"
              >
                <span className="hidden sm:inline">Report</span>
              </Button>
              {!workerUserId ? (
                <Button
                  fullWidth
                  onClick={() => navigate(`/login?next=${encodeURIComponent(`${publicMode ? '/jobs' : '/worker/jobs'}/${job.id}`)}`)}
                >
                  Log in to apply
                </Button>
              ) : myApplication ? (
                <Button fullWidth disabled>
                  {myApplication.status === 'withdrawn' ? 'Withdrawn' : 'Applied'}
                </Button>
              ) : (
                <Button
                  fullWidth
                  onClick={() => setApplyOpen(true)}
                  disabled={job.status !== 'published'}
                >
                  {job.status === 'published' ? 'Apply now' : 'Not open for applications'}
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar — employer */}
        <div className="space-y-4">
          {employer && (
            <Card className="p-5">
              <div className="flex items-center gap-3">
                {employerUser && <Avatar name={employerUser.name} color={employerUser.avatarColor} size="lg" />}
                <div className="min-w-0">
                  <h3 className="font-bold text-ink-900 truncate">{employer.businessName}</h3>
                  <p className="text-xs text-ink-500">{employer.category.replace('_', ' ')} · since {employer.establishedYear}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <VerificationBadge state={employer.verification} size="sm" />
                {employer.ratingCount > 0 && <StarRating value={employer.rating} count={employer.ratingCount} />}
              </div>
              <p className="mt-3 text-sm text-ink-600">{employer.description}</p>
              <div className="mt-3 space-y-1.5 text-xs text-ink-600">
                <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-400" />{employer.address}, {employer.area}</p>
                <p className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-ink-400" />{employer.jobsPosted} jobs posted</p>
                <p className="flex items-center gap-1.5">{contactIcon}Prefers: {CONTACT_PREF_LABELS[job.contactPreference]}</p>
              </div>
              {applicationStatus === 'accepted' ? (
                <p className="mt-3 rounded-lg bg-canvas-100 px-3 py-2 text-sm text-ink-700">
                  <Phone className="mr-1 inline h-4 w-4 text-ink-500" />
                  {employerPhone ? <a href={`tel:${employerPhone}`} className="font-semibold">{employerPhone}</a> : 'Contact unavailable'}
                </p>
              ) : (
                <p className="mt-3 rounded-lg bg-canvas-100 px-3 py-2 text-[11px] text-ink-500">
                  Contact details are shared only after you are accepted, to protect privacy.
                </p>
              )}
            </Card>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-ink-900">Reviews from workers</h3>
              <div className="mt-3 space-y-3">
                {reviews.slice(0, 3).map((r) => {
                  const reviewer = db.users.find((u) => u.id === r.reviewerUserId);
                  return (
                    <div key={r.id} className="border-b border-canvas-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        {reviewer && <Avatar name={reviewer.name} color={reviewer.avatarColor} size="sm" />}
                        <span className="text-sm font-semibold text-ink-800">{reviewer?.name ?? 'Worker'}</span>
                        <StarRating value={r.rating} size="sm" />
                      </div>
                      <p className="mt-1.5 text-sm text-ink-600">{r.comment}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Safety */}
          <Card className="p-5 bg-brand-50/40">
            <div className="flex items-center gap-2 text-brand-700">
              <ShieldCheck className="h-5 w-5" />
              <h3 className="font-bold">Safety tips</h3>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-ink-600">
              <li className="flex items-start gap-2"><Star className="mt-0.5 h-3.5 w-3.5 text-brand-500" />Confirm shift time and pay before going.</li>
              <li className="flex items-start gap-2"><Star className="mt-0.5 h-3.5 w-3.5 text-brand-500" />Meet at the listed business address, not private locations.</li>
              <li className="flex items-start gap-2"><Star className="mt-0.5 h-3.5 w-3.5 text-brand-500" />Never pay any fee to get a job.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Apply modal */}
      <Modal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Apply to this job"
        description={job.title}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={submitApply}>Submit application</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-canvas-100 p-3 text-sm text-ink-700">
            <p className="font-semibold text-ink-800">{job.title}</p>
            <p className="text-ink-500">{employer?.businessName} · {job.area} · {formatDate(job.date)}</p>
            <p className="mt-1 text-brand-700 font-bold">{formatINR(job.payAmount)} {PAY_BASIS_LABELS[job.payBasis]}</p>
          </div>
          <FieldWrap
            label="Message to employer (optional)"
            hint="A short note about your experience or availability improves your chances."
            error={applyError}
          >
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. I have 2 years of counter sales experience and live nearby in Satellite."
              rows={4}
              maxLength={500}
            />
          </FieldWrap>
          <p className="text-xs text-ink-400">
            Your profile details are shared with the employer to review your application. Contact details are available only after acceptance.
          </p>
        </div>
      </Modal>

      {report.dialog}
    </div>
  );
}

function InfoTile({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-3.5 ${highlight ? 'border-brand-200 bg-brand-50/60' : 'border-canvas-200 bg-white'}`}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
        <span className={highlight ? 'text-brand-600' : 'text-ink-400'}>{icon}</span>
        {label}
      </p>
      <p className={`mt-1 text-sm font-bold ${highlight ? 'text-brand-700' : 'text-ink-900'}`}>{value}</p>
    </div>
  );
}
