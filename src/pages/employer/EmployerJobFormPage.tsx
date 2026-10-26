import { useState, useMemo } from 'react';
import { ArrowLeft, Eye, CheckCircle2, X, Plus } from 'lucide-react';
import { useDB, useSession, createJob, updateJob } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FieldWrap } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CategoryIcon, VerificationBadge } from '@/components/shared';
import {
  CATEGORY_LABELS, PAY_BASIS_LABELS, PAYMENT_TIMING_LABELS, PAYMENT_METHOD_LABELS,
  EMPLOYMENT_TYPE_LABELS, CONTACT_PREF_LABELS,
  type JobCategory, type EmploymentType, type PayBasis, type PaymentTiming, type PaymentMethod, type ContactPreference, type JobStatus,
} from '@/types';
import { formatINR, formatDate, timeTo12h, shiftDuration } from '@/lib/utils';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const CATEGORIES: JobCategory[] = ['retail', 'event_support', 'packing', 'delivery', 'restaurant', 'warehouse', 'office_support'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['one_day', 'weekend', 'event', 'part_time', 'temporary'];
const PAY_BASES: PayBasis[] = ['per_hour', 'per_shift', 'per_day', 'per_task'];
const PAYMENT_TIMINGS: PaymentTiming[] = ['same_day', 'end_of_shift', 'weekly', 'after_completion'];
const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'bank_transfer', 'cash_or_upi'];
const CONTACT_PREFS: ContactPreference[] = ['call', 'whatsapp', 'app_message', 'email'];

interface FormState {
  title: string;
  category: JobCategory;
  description: string;
  responsibilities: string;
  requiredSkills: string[];
  workersNeeded: string;
  location: string;
  area: string;
  date: string;
  startTime: string;
  endTime: string;
  employmentType: EmploymentType;
  payAmount: string;
  payBasis: PayBasis;
  paymentTiming: PaymentTiming;
  paymentMethod: PaymentMethod;
  requirements: string;
  contactPreference: ContactPreference;
  benefits: string;
}

const todayStr = new Date().toISOString().slice(0, 10);

export function EmployerJobFormPage({ editJobId }: { editJobId?: string }) {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const userId = session.userId!;
  const profile = db.employerProfiles.find((e) => e.userId === userId)!;
  const editing = editJobId ? db.jobs.find((j) => j.id === editJobId) : undefined;

  const [form, setForm] = useState<FormState>(() => {
    if (editing) {
      return {
        title: editing.title,
        category: editing.category,
        description: editing.description,
        responsibilities: editing.responsibilities.join('\n'),
        requiredSkills: editing.requiredSkills,
        workersNeeded: String(editing.workersNeeded),
        location: editing.location,
        area: editing.area,
        date: editing.date,
        startTime: editing.startTime,
        endTime: editing.endTime,
        employmentType: editing.employmentType,
        payAmount: String(editing.payAmount),
        payBasis: editing.payBasis,
        paymentTiming: editing.paymentTiming,
        paymentMethod: editing.paymentMethod,
        requirements: editing.requirements.join('\n'),
        contactPreference: editing.contactPreference,
        benefits: editing.benefits.join('\n'),
      };
    }
    return {
      title: '',
      category: 'retail',
      description: '',
      responsibilities: '',
      requiredSkills: [],
      workersNeeded: '1',
      location: profile.address,
      area: profile.area,
      date: todayStr,
      startTime: '09:00',
      endTime: '17:00',
      employmentType: 'one_day',
      payAmount: '300',
      payBasis: 'per_day',
      paymentTiming: 'same_day',
      paymentMethod: 'cash_or_upi',
      requirements: '',
      contactPreference: 'call',
      benefits: '',
    };
  });
  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 4) e.title = 'Title must be at least 4 characters';
    if (form.description.trim().length < 20) e.description = 'Description must be at least 20 characters';
    const wn = Number(form.workersNeeded);
    if (!wn || wn < 1) e.workersNeeded = 'At least 1 worker';
    if (!form.location.trim()) e.location = 'Work location is required';
    if (!form.area.trim()) e.area = 'Area is required';
    if (!form.date) e.date = 'Date is required';
    else if (form.date < todayStr && !editing) e.date = 'Date cannot be in the past';
    if (!form.startTime || !form.endTime) e.endTime = 'Set start and end time';
    else if (form.endTime <= form.startTime) e.endTime = 'End time must be after start time';
    const pay = Number(form.payAmount);
    if (!pay || pay < 1) e.payAmount = 'Enter a valid pay amount';
    return e;
  };

  const buildJobData = () => {
    const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
    return {
      employerId: profile.id,
      employerUserId: userId,
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      responsibilities: splitLines(form.responsibilities),
      requiredSkills: form.requiredSkills,
      workersNeeded: Number(form.workersNeeded),
      location: form.location.trim(),
      area: form.area.trim(),
      city: 'Ahmedabad',
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      employmentType: form.employmentType,
      payAmount: Number(form.payAmount),
      payBasis: form.payBasis,
      paymentTiming: form.paymentTiming,
      paymentMethod: form.paymentMethod,
      requirements: splitLines(form.requirements),
      contactPreference: form.contactPreference,
      benefits: splitLines(form.benefits),
      status: 'published' as JobStatus,
    };
  };

  const [submitting, setSubmitting] = useState(false);

  const submit = async (asDraft = false) => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toastError('Please fix the highlighted fields.');
      return;
    }
    setSubmitting(true);
    try {
      const data = { ...buildJobData(), status: (asDraft ? 'draft' : 'published') as JobStatus };
      if (editing) {
        await updateJob(editing.id, data);
        toastSuccess(asDraft ? 'Job saved as draft' : 'Job updated and published');
      } else {
        await createJob(data);
        toastSuccess(asDraft ? 'Job saved as draft' : 'Job published! Workers can now apply.');
      }
      navigate('/employer/jobs');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save job.');
    } finally {
      setSubmitting(false);
    }
  };

  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !form.requiredSkills.includes(v)) set('requiredSkills', [...form.requiredSkills, v]);
    setSkillInput('');
  };

  const previewJob = useMemo(() => ({ ...buildJobData(), verification: profile.verification }), [form, profile.verification]);

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/employer/jobs')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </button>

      <SectionTitle title={editing ? 'Edit job' : 'Post a new job'} subtitle="Fill in the details. Workers see pay, hours and location upfront." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Basics */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-ink-900">Job basics</h3>
            <FieldWrap label="Job title" required error={errors.title}>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Counter Sales Helper — Weekend" invalid={!!errors.title} />
            </FieldWrap>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldWrap label="Category" required>
                <Select value={form.category} onChange={(e) => set('category', e.target.value as JobCategory)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </Select>
              </FieldWrap>
              <FieldWrap label="Employment type" required>
                <Select value={form.employmentType} onChange={(e) => set('employmentType', e.target.value as EmploymentType)}>
                  {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>)}
                </Select>
              </FieldWrap>
            </div>
            <FieldWrap label="Description" required error={errors.description} hint="Describe the work clearly. Avoid internal jargon.">
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={4} maxLength={800} invalid={!!errors.description} placeholder="What will the worker do? What's the environment like?" />
            </FieldWrap>
            <FieldWrap label="Responsibilities" hint="One per line">
              <Textarea value={form.responsibilities} onChange={(e) => set('responsibilities', e.target.value)} rows={3} placeholder="Operate billing counter&#10;Restock shelves&#10;Help customers" />
            </FieldWrap>
            <FieldWrap label="Required skills">
              <div className="flex gap-2">
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="e.g. Counter sales" />
                <Button type="button" variant="outline" onClick={addSkill} leftIcon={<Plus className="h-4 w-4" />}>Add</Button>
              </div>
              {form.requiredSkills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {form.requiredSkills.map((s) => (
                    <Badge key={s} variant="neutral" size="sm">{s}<button onClick={() => set('requiredSkills', form.requiredSkills.filter((x) => x !== s))} className="ml-1"><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
              )}
            </FieldWrap>
            <FieldWrap label="Number of workers needed" required error={errors.workersNeeded}>
              <Input type="number" min={1} value={form.workersNeeded} onChange={(e) => set('workersNeeded', e.target.value)} invalid={!!errors.workersNeeded} className="max-w-[10rem]" />
            </FieldWrap>
          </Card>

          {/* Schedule & location */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-ink-900">Schedule & location</h3>
            <FieldWrap label="Work location" required error={errors.location}>
              <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Full address or landmark" invalid={!!errors.location} />
            </FieldWrap>
            <FieldWrap label="Area" required error={errors.area} hint="Used for filtering by locality">
              <Input value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Satellite" invalid={!!errors.area} />
            </FieldWrap>
            <div className="grid sm:grid-cols-3 gap-4">
              <FieldWrap label="Date" required error={errors.date}>
                <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} invalid={!!errors.date} />
              </FieldWrap>
              <FieldWrap label="Start time" required>
                <Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
              </FieldWrap>
              <FieldWrap label="End time" required error={errors.endTime}>
                <Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} invalid={!!errors.endTime} />
              </FieldWrap>
            </div>
          </Card>

          {/* Pay */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-ink-900">Pay & payment</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldWrap label="Pay amount (₹)" required error={errors.payAmount}>
                <Input type="number" min={1} value={form.payAmount} onChange={(e) => set('payAmount', e.target.value)} invalid={!!errors.payAmount} />
              </FieldWrap>
              <FieldWrap label="Pay basis" required>
                <Select value={form.payBasis} onChange={(e) => set('payBasis', e.target.value as PayBasis)}>
                  {PAY_BASES.map((b) => <option key={b} value={b}>{PAY_BASIS_LABELS[b]}</option>)}
                </Select>
              </FieldWrap>
              <FieldWrap label="Payment timing">
                <Select value={form.paymentTiming} onChange={(e) => set('paymentTiming', e.target.value as PaymentTiming)}>
                  {PAYMENT_TIMINGS.map((t) => <option key={t} value={t}>{PAYMENT_TIMING_LABELS[t]}</option>)}
                </Select>
              </FieldWrap>
              <FieldWrap label="Payment method">
                <Select value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
                </Select>
              </FieldWrap>
            </div>
          </Card>

          {/* Extra */}
          <Card className="p-5 space-y-4">
            <h3 className="font-bold text-ink-900">Requirements & contact</h3>
            <FieldWrap label="Requirements" hint="One per line (e.g. ID needed, dress code)">
              <Textarea value={form.requirements} onChange={(e) => set('requirements', e.target.value)} rows={3} placeholder="Aadhaar or any ID for entry&#10;Reach by 9:15 AM" />
            </FieldWrap>
            <FieldWrap label="Contact preference">
              <Select value={form.contactPreference} onChange={(e) => set('contactPreference', e.target.value as ContactPreference)}>
                {CONTACT_PREFS.map((c) => <option key={c} value={c}>{CONTACT_PREF_LABELS[c]}</option>)}
              </Select>
            </FieldWrap>
            <FieldWrap label="Benefits" hint="One per line (optional)">
              <Textarea value={form.benefits} onChange={(e) => set('benefits', e.target.value)} rows={2} placeholder="Lunch provided&#10;Travel allowance: ₹50" />
            </FieldWrap>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2.5">
            <Button variant="ghost" onClick={() => navigate('/employer/jobs')} className="w-full sm:w-auto">Cancel</Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={submitting} className="w-full sm:w-auto">Save as draft</Button>
            <Button variant="outline" onClick={() => setPreviewOpen(true)} leftIcon={<Eye className="h-4 w-4" />} className="w-full sm:w-auto">Preview</Button>
            <Button onClick={() => submit(false)} disabled={submitting} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="w-full sm:w-auto">{editing ? 'Update & publish' : 'Publish job'}</Button>
          </div>
        </div>

        {/* Live preview side */}
        <div className="space-y-4">
          <Card className="p-5 sticky top-24">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-3">Live preview</p>
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CategoryIcon category={previewJob.category} className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="font-bold text-ink-900 truncate">{previewJob.title || 'Untitled job'}</p>
                <p className="text-xs text-ink-500">{profile.businessName}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge variant="teal" size="sm">{CATEGORY_LABELS[previewJob.category]}</Badge>
              <Badge variant="neutral" size="sm">{EMPLOYMENT_TYPE_LABELS[previewJob.employmentType]}</Badge>
              <VerificationBadge state={profile.verification} size="sm" />
            </div>
            <dl className="mt-3 space-y-1.5 text-xs text-ink-600">
              <div className="flex justify-between gap-2"><dt className="shrink-0">Location</dt><dd className="font-semibold text-ink-800 text-right">{previewJob.area}, Ahmedabad</dd></div>
              <div className="flex justify-between gap-2"><dt className="shrink-0">Date</dt><dd className="font-semibold text-ink-800 text-right">{formatDate(previewJob.date)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="shrink-0">Shift</dt><dd className="font-semibold text-ink-800 text-right">{timeTo12h(previewJob.startTime)}–{timeTo12h(previewJob.endTime)} · {shiftDuration(previewJob.startTime, previewJob.endTime)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="shrink-0">Workers</dt><dd className="font-semibold text-ink-800 text-right">{previewJob.workersNeeded}</dd></div>
              <div className="flex justify-between gap-2"><dt className="shrink-0">Pay</dt><dd className="font-bold text-brand-600 text-right">{formatINR(previewJob.payAmount)} {PAY_BASIS_LABELS[previewJob.payBasis]}</dd></div>
              <div className="flex justify-between gap-2"><dt className="shrink-0">Payment</dt><dd className="font-semibold text-ink-800 text-right">{PAYMENT_TIMING_LABELS[previewJob.paymentTiming]}</dd></div>
            </dl>
          </Card>
        </div>
      </div>

      {/* Full preview modal */}
      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Job preview" description="This is how workers will see your job." size="lg" footer={<><Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button><Button onClick={() => { setPreviewOpen(false); submit(false); }}>Publish</Button></>}>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><CategoryIcon category={previewJob.category} className="h-6 w-6" /></div>
            <div>
              <h3 className="text-lg font-bold text-ink-900">{previewJob.title || 'Untitled job'}</h3>
              <p className="text-sm text-ink-500">{profile.businessName} · {previewJob.area}</p>
            </div>
          </div>
          <p className="text-sm text-ink-700">{previewJob.description || 'No description yet.'}</p>
          {previewJob.responsibilities.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-ink-400">Responsibilities</p>
              <ul className="mt-1 space-y-1">{previewJob.responsibilities.map((r, i) => <li key={i} className="text-sm text-ink-700 flex gap-2"><CheckCircle2 className="h-4 w-4 text-brand-600 mt-0.5" />{r}</li>)}</ul>
            </div>
          )}
          <div className="rounded-xl bg-brand-50/60 p-3">
            <p className="text-lg font-extrabold text-brand-700">{formatINR(previewJob.payAmount)} <span className="text-xs font-medium text-ink-500">{PAY_BASIS_LABELS[previewJob.payBasis]}</span></p>
            <p className="text-xs text-ink-500">{PAYMENT_TIMING_LABELS[previewJob.paymentTiming]} · {PAYMENT_METHOD_LABELS[previewJob.paymentMethod]}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
