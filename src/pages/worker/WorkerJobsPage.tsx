import { useMemo, useState, useEffect } from 'react';
import { Search, MapPin, SlidersHorizontal, X, Frown } from 'lucide-react';
import { useDB, useSession, isJobSaved, toggleSaveJob } from '@/data/store';
import { useRouter } from '@/lib/router';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  CATEGORY_LABELS, EMPLOYMENT_TYPE_LABELS, PAY_BASIS_LABELS, type JobCategory, type EmploymentType,
} from '@/types';
import { toastSuccess } from '@/components/ui/Toast';

const CATEGORIES: JobCategory[] = ['retail', 'event_support', 'packing', 'delivery', 'restaurant', 'warehouse', 'office_support'];
const EMPLOYMENT_TYPES: EmploymentType[] = ['one_day', 'weekend', 'event', 'part_time', 'temporary'];
const SORTS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'pay_high', label: 'Pay: high to low' },
  { value: 'pay_low', label: 'Pay: low to high' },
  { value: 'date_near', label: 'Date: nearest first' },
  { value: 'distance', label: 'Area: A–Z' },
];

const AREAS = ['Satellite', 'Bodakdev', 'Vastrapur', 'Prahlad Nagar', 'Ellisbridge', 'Thaltej', 'Naroda', 'Maninagar', 'Bopal'];

export function WorkerJobsPage() {
  const db = useDB();
  const [session] = useSession();
  const { path, navigate } = useRouter();

  // Parse query string from current path
  const initialParams = useMemo(() => {
    const qIndex = path.indexOf('?');
    if (qIndex < 0) return new URLSearchParams();
    return new URLSearchParams(path.slice(qIndex + 1));
  }, [path]);

  const [query, setQuery] = useState(initialParams.get('q') ?? '');
  const [area, setArea] = useState(initialParams.get('area') ?? '');
  const [category, setCategory] = useState<JobCategory | ''>('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [payBasis, setPayBasis] = useState('');
  const [minPay, setMinPay] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [sort, setSort] = useState('recent');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setQuery(initialParams.get('q') ?? '');
    setArea(initialParams.get('area') ?? '');
  }, [initialParams]);

  const workerUserId = session.userId!;

  const filtered = useMemo(() => {
    let list = db.jobs.filter((j) => j.status === 'published');
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q) ||
          j.requiredSkills.some((s) => s.toLowerCase().includes(q)) ||
          j.area.toLowerCase().includes(q),
      );
    }
    if (area.trim()) {
      const a = area.toLowerCase();
      list = list.filter((j) => j.area.toLowerCase().includes(a) || j.location.toLowerCase().includes(a));
    }
    if (category) list = list.filter((j) => j.category === category);
    if (employmentType) list = list.filter((j) => j.employmentType === employmentType);
    if (payBasis) list = list.filter((j) => j.payBasis === payBasis);
    if (minPay) {
      const n = Number(minPay);
      if (!isNaN(n)) list = list.filter((j) => j.payAmount >= n);
    }
    if (dateFilter) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter((j) => {
        const jd = new Date(j.date);
        if (dateFilter === 'today') return jd.toDateString() === today.toDateString();
        if (dateFilter === 'tomorrow') {
          const t = new Date(today);
          t.setDate(t.getDate() + 1);
          return jd.toDateString() === t.toDateString();
        }
        if (dateFilter === 'week') {
          const end = new Date(today);
          end.setDate(end.getDate() + 7);
          return jd >= today && jd <= end;
        }
        if (dateFilter === 'weekend') {
          const day = jd.getDay();
          return (day === 0 || day === 6) && jd >= today;
        }
        return true;
      });
    }
    if (maxDistance) {
      list = list.filter((j) => j.area === maxDistance);
    }

    switch (sort) {
      case 'pay_high':
        list = [...list].sort((a, b) => b.payAmount - a.payAmount);
        break;
      case 'pay_low':
        list = [...list].sort((a, b) => a.payAmount - b.payAmount);
        break;
      case 'date_near':
        list = [...list].sort((a, b) => a.date.localeCompare(b.date));
        break;
      case 'distance':
        list = [...list].sort((a, b) => a.area.localeCompare(b.area));
        break;
      default:
        list = [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }
    return list;
  }, [db.jobs, query, area, category, employmentType, payBasis, minPay, dateFilter, maxDistance, sort]);

  const activeFilterCount =
    (category ? 1 : 0) +
    (employmentType ? 1 : 0) +
    (payBasis ? 1 : 0) +
    (minPay ? 1 : 0) +
    (dateFilter ? 1 : 0) +
    (maxDistance ? 1 : 0);

  const clearAll = () => {
    setCategory('');
    setEmploymentType('');
    setPayBasis('');
    setMinPay('');
    setDateFilter('');
    setMaxDistance('');
  };

  const onToggleSave = async (jobId: string) => {
    await toggleSaveJob(workerUserId, jobId);
    const saved = isJobSaved(db, workerUserId, jobId);
    toastSuccess(saved ? 'Job saved' : 'Removed from saved');
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Find work near you"
        subtitle={`${filtered.length} job${filtered.length === 1 ? '' : 's'} matching your filters in Ahmedabad`}
      />

      {/* Search bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, skill, or area"
              className="pl-9"
            />
          </div>
          <div className="relative sm:w-56">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <Input
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Area"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setShowFilters((s) => !s)}
            className="relative"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-canvas-100 pt-3 animate-slideUp">
            <div>
              <label className="text-xs font-semibold text-ink-600">Category</label>
              <Select value={category} onChange={(e) => setCategory(e.target.value as JobCategory | '')} className="mt-1 h-9">
                <option value="">All categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">Employment type</label>
              <Select value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType | '')} className="mt-1 h-9">
                <option value="">Any type</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">Pay basis</label>
              <Select value={payBasis} onChange={(e) => setPayBasis(e.target.value)} className="mt-1 h-9">
                <option value="">Any basis</option>
                {Object.entries(PAY_BASIS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">Minimum pay (₹)</label>
              <Input value={minPay} onChange={(e) => setMinPay(e.target.value)} type="number" min={0} placeholder="e.g. 200" className="mt-1 h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">Date</label>
              <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="mt-1 h-9">
                <option value="">Any date</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="week">Within 7 days</option>
                <option value="weekend">Weekends</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">Within area</label>
              <Select value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} className="mt-1 h-9">
                <option value="">All Ahmedabad</option>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-end">
                <Button variant="ghost" size="sm" leftIcon={<X className="h-4 w-4" />} onClick={clearAll}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Sort + active chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {category && (
            <Badge variant="brand" size="sm">
              {CATEGORY_LABELS[category]}
              <button onClick={() => setCategory('')} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {employmentType && (
            <Badge variant="teal" size="sm">
              {EMPLOYMENT_TYPE_LABELS[employmentType]}
              <button onClick={() => setEmploymentType('')} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
          {minPay && (
            <Badge variant="neutral" size="sm">
              ≥ ₹{minPay}
              <button onClick={() => setMinPay('')} className="ml-1"><X className="h-3 w-3" /></button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-400 shrink-0">Sort by</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 w-36 sm:w-44 text-xs">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Frown className="h-7 w-7" />}
            title="No jobs match your filters"
            description="Try widening your search — clear a filter or change the area."
            action={
              <Button variant="outline" onClick={clearAll} leftIcon={<X className="h-4 w-4" />}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              db={db}
              saved={isJobSaved(db, workerUserId, job.id)}
              onToggleSave={() => onToggleSave(job.id)}
              onOpen={() => navigate(`/worker/jobs/${job.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
