import { useState } from 'react';
import {
  Search, MapPin, ShieldCheck, Wallet, Clock, ArrowRight, Briefcase,
  Star, CheckCircle2,
} from 'lucide-react';
import { useRouter, linkProps } from '@/lib/router';
import { useDB } from '@/data/store';
import { Logo, CategoryIcon, VerificationBadge } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CATEGORY_LABELS, PAY_BASIS_LABELS, type JobCategory } from '@/types';
import { formatINR, formatDate } from '@/lib/utils';

const categories: JobCategory[] = [
  'retail', 'event_support', 'packing', 'delivery', 'restaurant', 'warehouse', 'office_support',
];

export function LandingPage() {
  const db = useDB();
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');

  const featured = db.jobs.filter((j) => j.status === 'published').slice(0, 6);

  const enterWorker = () => navigate('/jobs');
  const enterEmployer = () => navigate('/signup');

  const search = (overrides: { query?: string; area?: string } = {}) => {
    const params = new URLSearchParams();
    const nextQuery = overrides.query ?? query;
    const nextArea = overrides.area ?? area;
    if (nextQuery) params.set('q', nextQuery);
    if (nextArea) params.set('area', nextArea);
    const queryString = params.toString();
    navigate(`/jobs${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-canvas-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-canvas-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-600">
            <a {...linkProps('/login', navigate)} className="hover:text-ink-900">Log in</a>
            <a {...linkProps('/signup', navigate)} className="hover:text-ink-900">Sign up</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={enterWorker} className="hidden sm:inline-flex">
              Find work
            </Button>
            <Button variant="primary" size="sm" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Hire workers
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/60 to-canvas-50" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge variant="brand" className="mb-4">
                <MapPin className="h-3 w-3" /> Ahmedabad · Local work marketplace
              </Badge>
              <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-ink-900 leading-[1.1]">
                Find nearby work for a day, a weekend, or an event.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-ink-600 max-w-xl">
                LocalConnect links people ready to work with shops and employers who need short-term help — retail counters, events, packing, delivery, restaurants and more. Transparent pay, clear hours, verified employers.
              </p>

              {/* Search */}
              <div className="mt-7 rounded-2xl bg-white p-3 shadow-card border border-canvas-200">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Job title or keyword (e.g. counter sales)"
                      className="pl-9"
                      aria-label="Search jobs"
                    />
                  </div>
                  <div className="relative sm:w-56">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Area (Satellite, Vastrapur…)"
                      className="pl-9"
                      aria-label="Area"
                    />
                  </div>
                  <Button onClick={() => search()} leftIcon={<Search className="h-4 w-4" />}>
                    Search
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
                <span className="font-semibold text-ink-700">Popular:</span>
                {['Counter sales', 'Event ushers', 'Packing helpers', 'Delivery'].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setQuery(t);
                      search({ query: t });
                    }}
                    className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 hover:ring-brand-300 hover:text-brand-700 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Side card */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -top-6 -right-6 h-40 w-40 rounded-full bg-brand-100/60 blur-2xl" />
                <Card className="relative p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-500">Open right now in Ahmedabad</span>
                    <Badge variant="success" size="sm">{db.jobs.filter(j => j.status === 'published').length} jobs</Badge>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    {featured.slice(0, 4).map((job) => {
                      const employer = db.employerProfiles.find((e) => e.id === job.employerId);
                      return (
                        <div key={job.id} className="flex items-center gap-3 rounded-xl border border-canvas-100 p-3 hover:border-brand-200 transition-colors">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <CategoryIcon category={job.category} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink-900">{job.title}</p>
                            <p className="truncate text-xs text-ink-500">{employer?.businessName} · {job.area}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-600">{formatINR(job.payAmount)}</p>
                            <p className="text-[10px] text-ink-400">{PAY_BASIS_LABELS[job.payBasis]}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    variant="subtle"
                    fullWidth
                    className="mt-4"
                    onClick={enterWorker}
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    Browse all jobs
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category strip */}
      <section className="border-y border-canvas-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((cat) => {
              const count = db.jobs.filter((j) => j.category === cat && j.status === 'published').length;
              return (
                <button
                  key={cat}
                  onClick={() => navigate(`/jobs?category=${cat}`)}
                  className="flex flex-col items-center gap-2 rounded-xl p-3 text-center hover:bg-canvas-100 transition-colors"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <CategoryIcon category={cat} className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold text-ink-700 leading-tight">{CATEGORY_LABELS[cat]}</span>
                  <span className="text-[10px] text-ink-400">{count} open</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">Featured local jobs</h2>
            <p className="mt-1.5 text-sm sm:text-base text-ink-500">Realistic openings across Ahmedabad, with transparent pay and hours.</p>
          </div>
          <Button variant="outline" onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />} className="self-start sm:self-auto shrink-0">
            View all
          </Button>
        </div>
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((job) => {
            const employer = db.employerProfiles.find((e) => e.id === job.employerId);
            return (
              <Card
                key={job.id}
                className="p-5 flex flex-col hover:shadow-cardHover transition-shadow cursor-pointer"
                onClick={() => navigate(`/jobs/${job.id}`)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/jobs/${job.id}`);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CategoryIcon category={job.category} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-ink-900 truncate">{job.title}</h3>
                    <p className="text-sm text-ink-500 truncate">{employer?.businessName}</p>
                  </div>
                  <VerificationBadge state={job.verification} size="sm" />
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-ink-600">
                  <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-400" /> {job.area}, {job.city}</p>
                  <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-ink-400" /> {formatDate(job.date)} · {job.startTime}–{job.endTime}</p>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-canvas-100 pt-3">
                  <div>
                    <p className="text-lg font-extrabold text-brand-600">{formatINR(job.payAmount)} <span className="text-xs font-medium text-ink-400">{PAY_BASIS_LABELS[job.payBasis]}</span></p>
                  </div>
                  <Badge variant="teal" size="sm">{CATEGORY_LABELS[job.category]}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-canvas-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">How LocalConnect works</h2>
            <p className="mt-2 text-ink-500">Simple steps for both workers and employers. No middlemen, no hidden fees.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Search className="h-6 w-6" />, t: 'Search nearby jobs', d: 'Filter by area, category, date, shift and pay. See exactly what you will earn.' },
              { icon: <Briefcase className="h-6 w-6" />, t: 'Apply in one tap', d: 'Send a quick application with an optional note. Track status from Applied to Accepted.' },
              { icon: <Wallet className="h-6 w-6" />, t: 'Work and get paid', d: 'Show up, do the shift, and get paid same-day, end-of-shift, or as agreed.' },
            ].map((s, i) => (
              <Card key={i} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                  {s.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink-900">{s.t}</h3>
                <p className="mt-1.5 text-sm text-ink-600">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & safety */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="brand" className="mb-4"><ShieldCheck className="h-3 w-3" /> Trust & safety</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">Transparent, verified, and respectful of your time.</h2>
            <ul className="mt-6 space-y-4">
              {[
                { icon: <ShieldCheck className="h-5 w-5" />, t: 'Demo Verified employers', d: 'Verified employers carry a Demo Verified badge. Unverified employers are clearly marked.' },
                { icon: <Wallet className="h-5 w-5" />, t: 'Pay shown upfront', d: 'Every listing shows the pay amount, basis (per hour/day/shift/task), and payment timing.' },
                { icon: <Star className="h-5 w-5" />, t: 'Ratings & reviews', d: 'Sample ratings from past work help you judge employers before you apply.' },
                { icon: <CheckCircle2 className="h-5 w-5" />, t: 'Report anything suspicious', d: 'Flag a job or user from any listing. Reports go to the demo moderation queue.' },
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">{item.icon}</span>
                  <div>
                    <p className="font-bold text-ink-900">{item.t}</p>
                    <p className="text-sm text-ink-600">{item.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6 bg-gradient-to-br from-brand-50/50 to-white">
            <p className="text-sm font-semibold text-brand-700">For employers</p>
            <h3 className="mt-1 text-xl font-bold text-ink-900">Hire reliable local workers for short shifts.</h3>
            <p className="mt-2 text-sm text-ink-600">Post a job in minutes. Get applications from workers nearby, shortlist, accept, and manage — all in one place.</p>
            <div className="mt-4 space-y-2.5">
              {[
                'Active jobs across 7 categories',
                'Applicant skills, availability and ratings',
                'Pause, reopen, or close jobs anytime',
              ].map((t) => (
                <p key={t} className="flex items-center gap-2 text-sm text-ink-700">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" /> {t}
                </p>
              ))}
            </div>
            <Button className="mt-5" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Start hiring — employer demo
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-16">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <h3 className="text-2xl font-extrabold font-display text-ink-900">I want to find work</h3>
              <p className="mt-2 text-ink-600">Browse nearby one-day, weekend, and part-time jobs. Apply in seconds, track your applications, and get paid for your time.</p>
              <Button className="mt-5" onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Enter as worker
              </Button>
            </div>
            <div className="bg-brand-600 p-8 sm:p-10 text-white">
              <h3 className="text-2xl font-extrabold font-display">I need to hire workers</h3>
              <p className="mt-2 text-brand-50/90">Post a short-term job, set the pay and shift, and review applicants from your area. Manage everything from one dashboard.</p>
              <Button variant="secondary" className="mt-5 bg-white text-brand-700 hover:bg-brand-50" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Enter as employer
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-canvas-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-ink-400 text-center sm:text-right max-w-md">
            LocalConnect is a college design-thinking prototype. All jobs, profiles, ratings and reviews are sample data for demonstration only — no real employment or payment is offered.
          </p>
        </div>
      </footer>
    </div>
  );
}
