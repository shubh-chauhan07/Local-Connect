import { useState, useEffect } from 'react';
import { Phone, MapPin, Briefcase, Plus, X } from 'lucide-react';
import { useDB, useSession, updateWorkerProfile } from '@/data/store';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, FieldWrap, Textarea, Select } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Avatar, StarRating, VerificationBadge } from '@/components/shared';
import { CATEGORY_LABELS, type WorkerProfile, type WorkHistoryItem, type JobCategory } from '@/types';
import { formatDate } from '@/lib/utils';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const AREAS = ['Satellite', 'Bodakdev', 'Vastrapur', 'Prahlad Nagar', 'Ellisbridge', 'Thaltej', 'Naroda', 'Maninagar', 'Bopal', 'Asarwa'];
const AVAILABILITY = ['Weekday mornings', 'Weekday afternoons', 'Evenings', 'Weekends', 'Festive season'];

export function WorkerProfilePage() {
  const db = useDB();
  const [session] = useSession();
  const workerUserId = session.userId ?? '';
  const user = db.users.find((u) => u.id === workerUserId);
  const profile = db.workerProfiles.find((w) => w.userId === workerUserId);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? user?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? user?.phone ?? '');
  const [preferredArea, setPreferredArea] = useState(profile?.preferredArea ?? 'Satellite');
  const [areas, setAreas] = useState<string[]>(profile?.areas ?? ['Satellite']);
  const [skills, setSkills] = useState<string[]>(profile?.skills ?? []);
  const [skillInput, setSkillInput] = useState('');
  const [availability, setAvailability] = useState<string[]>(profile?.availability ?? []);
  const [experienceYears, setExperienceYears] = useState(String(profile?.experienceYears ?? 0));
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
      setPreferredArea(profile.preferredArea);
      setAreas(profile.areas);
      setSkills(profile.skills);
      setAvailability(profile.availability);
      setExperienceYears(String(profile.experienceYears));
      setBio(profile.bio);
    }
  }, [profile]);

  const toggleArea = (a: string) => setAreas((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const toggleAvail = (a: string) => setAvailability((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const addSkill = () => {
    const v = skillInput.trim();
    if (v && !skills.includes(v)) setSkills((p) => [...p, v]);
    setSkillInput('');
  };

  const [saving, setSaving] = useState(false);

  const save = async () => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) errs.fullName = 'Enter your name';
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) errs.phone = 'Enter a valid phone';
    if (areas.length === 0) errs.areas = 'Pick at least one area';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const completion = Math.min(
      100,
      30 +
        (fullName ? 10 : 0) +
        (phone ? 10 : 0) +
        (areas.length ? 10 : 0) +
        (skills.length ? 15 : 0) +
        (availability.length ? 10 : 0) +
        (bio ? 10 : 0) +
        (Number(experienceYears) > 0 ? 5 : 0),
    );

    setSaving(true);
    try {
      await updateWorkerProfile(workerUserId, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        preferredArea,
        areas,
        skills,
        availability,
        experienceYears: Number(experienceYears) || 0,
        bio: bio.trim(),
        profileCompletion: completion,
      });
      setEditing(false);
      toastSuccess('Profile updated');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveProfile: WorkerProfile = profile ?? {
    id: `wp_${workerUserId}`,
    userId: workerUserId,
    fullName: user?.name ?? fullName ?? 'Worker',
    phone: user?.phone ?? phone ?? '',
    preferredArea: preferredArea || 'Satellite, Ahmedabad',
    areas: areas && areas.length ? areas : ['Satellite'],
    skills: skills || [],
    availability: availability && availability.length ? availability : ['Weekday mornings'],
    experienceYears: Number(experienceYears) || 0,
    bio: bio || '',
    rating: 0,
    ratingCount: 0,
    completedJobs: 0,
    profileCompletion: 40,
    workHistory: [],
  };

  if (!workerUserId) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-6">
        <h2 className="text-lg font-bold text-ink-900">Loading worker profile...</h2>
        <p className="mt-2 text-sm text-ink-500">Retrieving your profile details.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="My profile"
        action={!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>}
      />

      {/* Header card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={user?.name ?? effectiveProfile.fullName} color={user?.avatarColor ?? '#10b981'} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-extrabold font-display text-ink-900">{effectiveProfile.fullName}</h1>
            <p className="text-sm text-ink-500 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{effectiveProfile.preferredArea}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerificationBadge state={user?.verification ?? 'unverified'} size="sm" />
              {effectiveProfile.rating > 0 && <StarRating value={effectiveProfile.rating} count={effectiveProfile.ratingCount} />}
              <Badge variant="neutral" size="sm">{effectiveProfile.completedJobs} jobs done</Badge>
            </div>
          </div>
          {/* Completion */}
          <div className="sm:w-48">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-ink-600">Profile completion</span>
              <span className="font-bold text-brand-600">{effectiveProfile.profileCompletion}%</span>
            </div>
            <div className="mt-1.5 h-2 w-full rounded-full bg-canvas-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${effectiveProfile.profileCompletion}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {editing ? (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap label="Full name" required error={errors.fullName}>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} invalid={!!errors.fullName} />
            </FieldWrap>
            <FieldWrap label="Phone" required error={errors.phone}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} invalid={!!errors.phone} />
            </FieldWrap>
            <FieldWrap label="Preferred area">
              <Select value={preferredArea} onChange={(e) => setPreferredArea(e.target.value)}>
                {AREAS.map((a) => <option key={a} value={`${a}, Ahmedabad`}>{a}, Ahmedabad</option>)}
              </Select>
            </FieldWrap>
            <FieldWrap label="Experience (years)">
              <Input type="number" min={0} value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            </FieldWrap>
          </div>

          <FieldWrap label="Areas willing to work in" required error={errors.areas}>
            <div className="flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleArea(a)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${areas.includes(a) ? 'bg-brand-600 text-white' : 'bg-canvas-100 text-ink-600 ring-1 ring-inset ring-ink-200'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </FieldWrap>

          <FieldWrap label="Skills" hint="Press Enter or click Add to add a skill">
            <div className="flex gap-2">
              <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} placeholder="e.g. Counter sales" />
              <Button type="button" variant="outline" onClick={addSkill} leftIcon={<Plus className="h-4 w-4" />}>Add</Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <Badge key={s} variant="neutral" size="sm">
                  {s}
                  <button onClick={() => setSkills((p) => p.filter((x) => x !== s))} className="ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </FieldWrap>

          <FieldWrap label="Availability">
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAvail(a)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${availability.includes(a) ? 'bg-teal-600 text-white' : 'bg-canvas-100 text-ink-600 ring-1 ring-inset ring-ink-200'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </FieldWrap>

          <FieldWrap label="About you">
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short intro about your experience and what work you're looking for." rows={3} maxLength={300} />
          </FieldWrap>

          <div className="flex justify-end gap-2.5">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>Save changes</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="p-5 lg:col-span-2 space-y-5">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Contact</h2>
              <p className="mt-1.5 flex items-center gap-2 text-sm text-ink-700"><Phone className="h-4 w-4 text-ink-400" />{effectiveProfile.phone || 'No phone set'}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(effectiveProfile.skills ?? []).length ? (effectiveProfile.skills ?? []).map((s: string) => <Badge key={s} variant="brand" size="sm">{s}</Badge>) : <p className="text-sm text-ink-400">No skills added yet.</p>}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Availability</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(effectiveProfile.availability ?? []).length ? (effectiveProfile.availability ?? []).map((a: string) => <Badge key={a} variant="teal" size="sm">{a}</Badge>) : <p className="text-sm text-ink-400">Not set.</p>}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Areas</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(effectiveProfile.areas ?? []).map((a: string) => <Badge key={a} variant="neutral" size="sm">{a}</Badge>)}
              </div>
            </div>
            {effectiveProfile.bio && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">About</h2>
                <p className="mt-1.5 text-sm text-ink-700">{effectiveProfile.bio}</p>
              </div>
            )}
          </Card>

          {/* Work history */}
          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Work history & reviews</h2>
            {!Array.isArray(effectiveProfile.workHistory) || effectiveProfile.workHistory.length === 0 ? (
              <EmptyState className="py-6" icon={<Briefcase className="h-6 w-6" />} title="No completed work yet" description="Your completed jobs and reviews will appear here." />
            ) : (
              <div className="mt-3 space-y-3">
                {effectiveProfile.workHistory.map((w: WorkHistoryItem) => (
                  <div key={w.id} className="border-b border-canvas-100 pb-3 last:border-0">
                    <p className="font-semibold text-ink-900 text-sm">{w.jobTitle}</p>
                    <p className="text-xs text-ink-500">{w.employerName} · {CATEGORY_LABELS[w.category as JobCategory] ?? w.category} · {formatDate(w.completedOn)}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StarRating value={w.rating} size="sm" />
                    </div>
                    {w.review && <p className="mt-1 text-xs text-ink-600 italic">"{w.review}"</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
