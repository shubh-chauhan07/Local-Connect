import { useState, useEffect } from 'react';
import { MapPin, Phone, Building2, Calendar, Star } from 'lucide-react';
import { useDB, useSession, updateEmployerProfile, getReviewsForTarget } from '@/data/store';
import { Card, SectionTitle, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, FieldWrap } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { Avatar, VerificationBadge, StarRating } from '@/components/shared';
import { CATEGORY_LABELS, type JobCategory, type EmployerProfile } from '@/types';
import { toastSuccess, toastError } from '@/components/ui/Toast';

const CATEGORIES: JobCategory[] = ['retail', 'event_support', 'packing', 'delivery', 'restaurant', 'warehouse', 'office_support'];

export function EmployerProfilePage() {
  const db = useDB();
  const [session] = useSession();
  const userId = session.userId ?? '';
  const user = db.users.find((u) => u.id === userId);
  const profile = db.employerProfiles.find((e) => e.userId === userId);
  const reviews = profile ? getReviewsForTarget(db, 'employer', profile.id) : [];

  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState(profile?.businessName ?? user?.name ?? '');
  const [category, setCategory] = useState<JobCategory>(profile?.category ?? 'retail');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [area, setArea] = useState(profile?.area ?? 'Satellite');
  const [phone, setPhone] = useState(profile?.phone ?? user?.phone ?? '');
  const [description, setDescription] = useState(profile?.description ?? '');
  const [establishedYear, setEstablishedYear] = useState(String(profile?.establishedYear ?? new Date().getFullYear()));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName);
      setCategory(profile.category);
      setAddress(profile.address);
      setArea(profile.area);
      setPhone(profile.phone);
      setDescription(profile.description);
      setEstablishedYear(String(profile.establishedYear));
    }
  }, [profile]);

  const [saving, setSaving] = useState(false);

  const save = async () => {
    const e: Record<string, string> = {};
    if (businessName.trim().length < 2) e.businessName = 'Business name is required';
    if (!/^[0-9+\-\s]{10,15}$/.test(phone)) e.phone = 'Enter a valid phone';
    if (!address.trim()) e.address = 'Address is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await updateEmployerProfile(userId, {
        businessName: businessName.trim(),
        category,
        address: address.trim(),
        area: area.trim(),
        phone: phone.trim(),
        description: description.trim(),
        establishedYear: Number(establishedYear) || new Date().getFullYear(),
      });
      setEditing(false);
      toastSuccess('Business profile updated');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const effectiveProfile: EmployerProfile = profile ?? {
    id: `ep_${userId}`,
    userId,
    businessName: user?.name ? `${user.name}'s Business` : businessName || 'Local Business',
    category: category || 'retail',
    address: address || 'Ahmedabad',
    area: area || 'Satellite',
    city: 'Ahmedabad',
    phone: user?.phone ?? phone ?? '',
    description: description || '',
    verification: 'unverified',
    rating: 0,
    ratingCount: 0,
    jobsPosted: 0,
    establishedYear: Number(establishedYear) || new Date().getFullYear(),
  };

  if (!userId) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-6">
        <h2 className="text-lg font-bold text-ink-900">Loading business profile...</h2>
        <p className="mt-2 text-sm text-ink-500">Retrieving your business information.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Business profile"
        action={!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit profile</Button>}
      />

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={user?.name ?? effectiveProfile.businessName} color={user?.avatarColor ?? '#10b981'} size="lg" />
          <div className="flex-1">
            <h1 className="text-xl font-extrabold font-display text-ink-900">{effectiveProfile.businessName}</h1>
            <p className="text-sm text-ink-500 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{effectiveProfile.area}, {effectiveProfile.city}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerificationBadge state={effectiveProfile.verification} size="sm" />
              {effectiveProfile.ratingCount > 0 && <StarRating value={effectiveProfile.rating} count={effectiveProfile.ratingCount} />}
              <Badge variant="neutral" size="sm">{effectiveProfile.jobsPosted} jobs posted</Badge>
              <Badge variant="neutral" size="sm">Since {effectiveProfile.establishedYear}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {editing ? (
        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldWrap label="Business name" required error={errors.businessName}>
              <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} invalid={!!errors.businessName} />
            </FieldWrap>
            <FieldWrap label="Category">
              <Select value={category} onChange={(e) => setCategory(e.target.value as JobCategory)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </Select>
            </FieldWrap>
            <FieldWrap label="Phone" required error={errors.phone}>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} invalid={!!errors.phone} />
            </FieldWrap>
            <FieldWrap label="Established year">
              <Input type="number" min={1900} max={new Date().getFullYear()} value={establishedYear} onChange={(e) => setEstablishedYear(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Address" required error={errors.address}>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} invalid={!!errors.address} />
            </FieldWrap>
            <FieldWrap label="Area">
              <Input value={area} onChange={(e) => setArea(e.target.value)} />
            </FieldWrap>
          </div>
          <FieldWrap label="About the business">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={400} placeholder="A short description of your business." />
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
              <p className="mt-1 flex items-center gap-2 text-sm text-ink-700"><Building2 className="h-4 w-4 text-ink-400" />{effectiveProfile.address}, {effectiveProfile.area}, {effectiveProfile.city}</p>
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Category</h2>
              <p className="mt-1.5"><Badge variant="teal">{CATEGORY_LABELS[effectiveProfile.category]}</Badge></p>
            </div>
            {effectiveProfile.description && (
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">About</h2>
                <p className="mt-1.5 text-sm text-ink-700">{effectiveProfile.description}</p>
              </div>
            )}
            <div className="rounded-xl bg-canvas-100 p-3 text-xs text-ink-500">
              <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Verification state: <VerificationBadge state={effectiveProfile.verification} size="sm" /></p>
              <p className="mt-1.5">Demo profiles show as Demo Verified or Not Verified. LocalConnect does not perform real identity verification in this prototype.</p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-ink-900">Reviews from workers</h2>
            {reviews.length === 0 ? (
              <EmptyState className="py-6" icon={<Star className="h-6 w-6" />} title="No reviews yet" description="Reviews from workers who completed your jobs will appear here." />
            ) : (
              <div className="mt-3 space-y-3">
                {reviews.map((r) => {
                  const reviewer = db.users.find((u) => u.id === r.reviewerUserId);
                  return (
                    <div key={r.id} className="border-b border-canvas-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2">
                        {reviewer && <Avatar name={reviewer.name} color={reviewer.avatarColor} size="sm" />}
                        <span className="text-sm font-semibold text-ink-800">{reviewer?.name ?? 'Worker'}</span>
                      </div>
                      <div className="mt-1"><StarRating value={r.rating} size="sm" /></div>
                      <p className="mt-1 text-sm text-ink-600">{r.comment}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
