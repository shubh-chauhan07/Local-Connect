import { useState } from 'react';
import {
  Search, MapPin, ShieldCheck, Wallet, Clock, ArrowRight, Briefcase,
  Star, CheckCircle2, Building2, UserCheck,
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
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const publishedJobs = db.jobs.filter((j) => j.status === 'published');
  const featured = publishedJobs.slice(0, 6);

  const enterWorker = () => navigate('/jobs');
  const enterEmployer = () => navigate('/signup');

  const search = (overrides: { query?: string; area?: string; category?: string } = {}) => {
    const params = new URLSearchParams();
    const nextQuery = overrides.query ?? query;
    const nextArea = overrides.area ?? area;
    const nextCat = overrides.category ?? selectedCategory;
    if (nextQuery) params.set('q', nextQuery);
    if (nextArea) params.set('area', nextArea);
    if (nextCat) params.set('category', nextCat);
    const queryString = params.toString();
    navigate(`/jobs${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-canvas-50">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-canvas-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-ink-600">
            <a {...linkProps('/jobs', navigate)} className="hover:text-brand-700 transition-colors">Find Jobs</a>
            <a {...linkProps('/login', navigate)} className="hover:text-ink-900 transition-colors">Log in</a>
            <a {...linkProps('/signup', navigate)} className="hover:text-ink-900 transition-colors">Sign up</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={enterWorker} className="hidden sm:inline-flex">
              Find Jobs
            </Button>
            <Button variant="primary" size="sm" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Hire Workers
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-canvas-200/80">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50/70 via-canvas-50/40 to-canvas-50" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-20 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <Badge variant="brand" className="mb-4">
                <MapPin className="h-3.5 w-3.5" /> Ahmedabad · Hyper-Local Job Network
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-ink-900 leading-[1.08]">
                Good work. Right nearby.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-ink-600 max-w-xl leading-relaxed">
                Find flexible local jobs or hire reliable workers whenever you need them. Connect with neighborhood retail counters, catering events, delivery hubs, and small businesses across Ahmedabad.
              </p>

              {/* Search Bar */}
              <div className="mt-8 rounded-2xl bg-white p-3 sm:p-3.5 shadow-card border border-canvas-200">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="relative sm:col-span-5">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Job title or role (e.g. cashier)"
                      className="pl-9 h-11"
                      aria-label="Search jobs"
                    />
                  </div>
                  <div className="relative sm:col-span-4">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Area (Satellite, Vastrapur…)"
                      className="pl-9 h-11"
                      aria-label="Area"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Button onClick={() => search()} fullWidth className="h-11">
                      Find Jobs
                    </Button>
                  </div>
                </div>

                {/* Secondary Category Control */}
                <div className="mt-3 pt-3 border-t border-canvas-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-ink-500">
                    <span className="font-semibold text-ink-700">Category:</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        search({ category: e.target.value });
                      }}
                      className="bg-canvas-100 rounded-lg px-2.5 py-1 text-xs font-semibold text-ink-700 border-0 focus:ring-1 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-400">Popular:</span>
                    {['Counter sales', 'Event staff', 'Delivery'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setQuery(t);
                          search({ query: t });
                        }}
                        className="rounded-full bg-canvas-100 px-2.5 py-0.5 font-medium text-ink-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary / Secondary CTA Buttons */}
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Find Jobs
                </Button>
                <Button variant="outline" onClick={enterEmployer} leftIcon={<Building2 className="h-4 w-4" />}>
                  Hire Workers
                </Button>
              </div>

              {/* Proof Points */}
              <div className="mt-8 pt-6 border-t border-canvas-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-ink-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-medium">Verified local businesses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-medium">Clear hourly/daily rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-medium">Fast 1-tap hiring</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
                  <span className="font-medium">Direct communication</span>
                </div>
              </div>
            </div>

            {/* Restrained Side Element: Tasteful Live Jobs Preview */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative">
                <div className="absolute -top-6 -right-6 h-48 w-48 rounded-full bg-brand-100/60 blur-2xl" />
                <Card className="relative p-5 shadow-cardHover">
                  <div className="flex items-center justify-between pb-3 border-b border-canvas-100">
                    <div>
                      <span className="text-sm font-bold text-ink-900">Active nearby in Ahmedabad</span>
                      <p className="text-xs text-ink-400">Real opportunities with upfront pay</p>
                    </div>
                    <Badge variant="success" size="sm">{publishedJobs.length} open</Badge>
                  </div>
                  <div className="mt-3.5 space-y-2.5">
                    {featured.slice(0, 4).map((job) => {
                      const employer = db.employerProfiles.find((e) => e.id === job.employerId);
                      return (
                        <div
                          key={job.id}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="flex items-center gap-3 rounded-xl border border-canvas-100 p-3 hover:border-brand-200 hover:bg-canvas-50/50 transition-all cursor-pointer"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                            <CategoryIcon category={job.category} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink-900">{job.title}</p>
                            <p className="truncate text-xs text-ink-500">{employer?.businessName ?? 'Local business'} · {job.area}</p>
                          </div>
                          <div className="text-right shrink-0">
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
                    Browse all {publishedJobs.length} jobs
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Popular Job Categories */}
      <section className="border-b border-canvas-200 bg-white py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">Popular job categories</h2>
            <p className="mt-1.5 text-sm text-ink-500">Explore short-term shifts and gigs in your neighborhood.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {categories.map((cat) => {
              const count = db.jobs.filter((j) => j.category === cat && j.status === 'published').length;
              return (
                <button
                  key={cat}
                  onClick={() => navigate(`/jobs?category=${cat}`)}
                  className="group flex flex-col items-center gap-2.5 rounded-2xl border border-canvas-200/80 p-4 text-center hover:border-brand-300 hover:shadow-card transition-all bg-white"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
                    <CategoryIcon category={cat} className="h-6 w-6" />
                  </span>
                  <span className="text-xs font-bold text-ink-800 leading-tight group-hover:text-brand-700 transition-colors">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="text-[11px] font-medium text-ink-400">{count} open</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2. Featured Local Jobs */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">Featured local jobs</h2>
            <p className="mt-1.5 text-sm text-ink-500">Realistic openings across Ahmedabad, with transparent pay and shift hours.</p>
          </div>
          <Button variant="outline" onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />} className="self-start sm:self-auto shrink-0">
            View all jobs
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((job) => {
            const employer = db.employerProfiles.find((e) => e.id === job.employerId);
            return (
              <Card
                key={job.id}
                className="p-5 flex flex-col hover:shadow-cardHover hover:border-brand-200 transition-all cursor-pointer"
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <CategoryIcon category={job.category} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-ink-900 truncate">{job.title}</h3>
                    <p className="text-xs text-ink-500 truncate">{employer?.businessName ?? 'Local business'}</p>
                  </div>
                  <VerificationBadge state={job.verification} size="sm" />
                </div>
                <div className="mt-3.5 space-y-1.5 text-xs text-ink-600">
                  <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-ink-400" /> {job.area}, {job.city}</p>
                  <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-ink-400" /> {formatDate(job.date)} · {job.startTime}–{job.endTime}</p>
                </div>
                <div className="mt-4 flex items-end justify-between border-t border-canvas-100 pt-3">
                  <div>
                    <p className="text-lg font-extrabold text-brand-600">
                      {formatINR(job.payAmount)} <span className="text-xs font-medium text-ink-500">{PAY_BASIS_LABELS[job.payBasis]}</span>
                    </p>
                  </div>
                  <Badge variant="teal" size="sm">{CATEGORY_LABELS[job.category]}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. How LocalConnect Works */}
      <section className="bg-white border-y border-canvas-200 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <Badge variant="neutral" className="mb-2">Simple 3-step process</Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">How LocalConnect works</h2>
            <p className="mt-2 text-ink-500">Transparent temporary hiring for Ahmedabad. No middlemen, no commission taken from workers.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: <Search className="h-6 w-6" />,
                t: 'Find nearby jobs',
                d: 'Search by neighborhood (Satellite, Vastrapur, Bodakdev), role category, date, and shift. See exact wages upfront before applying.',
              },
              {
                step: '02',
                icon: <Briefcase className="h-6 w-6" />,
                t: 'Apply in one tap',
                d: 'Submit an application with an optional introductory note. Track review status in real time from Applied to Accepted.',
              },
              {
                step: '03',
                icon: <Wallet className="h-6 w-6" />,
                t: 'Work and get paid',
                d: 'Complete your shift at the business location. Get paid directly via cash or UPI upon shift completion as agreed.',
              },
            ].map((s, i) => (
              <Card key={i} className="p-6 relative overflow-hidden">
                <span className="absolute top-4 right-4 text-3xl font-black text-canvas-200 select-none">{s.step}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                  {s.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-ink-900">{s.t}</h3>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed">{s.d}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 4 & 5. Benefits for Workers & Employers */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">Built for both sides of the local market</h2>
          <p className="mt-2 text-ink-500">Whether you are looking for short-term earnings or reliable local hands, LocalConnect keeps it effortless.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Benefits for Workers */}
          <Card className="p-7 sm:p-8 flex flex-col justify-between border-brand-100 bg-gradient-to-br from-brand-50/40 via-white to-white">
            <div>
              <div className="flex items-center gap-2 text-brand-700">
                <UserCheck className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">For Workers</span>
              </div>
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-ink-900">Earn flexibly on your schedule</h3>
              <p className="mt-2 text-sm text-ink-600">Pick up work for a day, a weekend, or a festival rush without long-term lock-in.</p>
              <ul className="mt-5 space-y-3">
                {[
                  '100% upfront pay transparency — know your rate before applying',
                  'Zero commission deducted from your earnings',
                  'Verified business profiles with address and rating history',
                  'Convenient shifts close to your home area in Ahmedabad',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-7 pt-5 border-t border-canvas-200/60">
              <Button onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Browse available shifts
              </Button>
            </div>
          </Card>

          {/* Benefits for Employers */}
          <Card className="p-7 sm:p-8 flex flex-col justify-between border-ink-100 bg-gradient-to-br from-canvas-100/50 via-white to-white">
            <div>
              <div className="flex items-center gap-2 text-ink-700">
                <Building2 className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-wider">For Employers & Small Shops</span>
              </div>
              <h3 className="mt-2 text-xl sm:text-2xl font-bold text-ink-900">Hire dependable helpers in minutes</h3>
              <p className="mt-2 text-sm text-ink-600">Solve unexpected staff shortages, weekend rushes, and event needs quickly.</p>
              <ul className="mt-5 space-y-3">
                {[
                  'Post short-term openings in under 2 minutes with preset skills',
                  'Review applicant profiles, skills, availability, and past ratings',
                  'Simple candidate management: Shortlist, Accept, or Reject',
                  'Phone and WhatsApp details shared only upon mutual acceptance',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-7 pt-5 border-t border-canvas-200/60">
              <Button variant="outline" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4" />}>
                Post a job opening
              </Button>
            </div>
          </Card>
        </div>
      </section>

      {/* 6. Trust & Safety Section */}
      <section className="bg-white border-y border-canvas-200 py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <Badge variant="brand" className="mb-3">
                <ShieldCheck className="h-3.5 w-3.5" /> Trust & safety
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">
                Transparent, verified, and respectful of your time.
              </h2>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">
                LocalConnect promotes fair and secure local commerce. Real business badges, clear compensation, transparent reviews, and an active reporting mechanism protect both sides.
              </p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <ShieldCheck className="h-5 w-5 text-brand-600" />,
                  t: 'Verified employer badges',
                  d: 'Established local businesses carry verified badges. Unverified profiles are clearly signaled.',
                },
                {
                  icon: <Wallet className="h-5 w-5 text-brand-600" />,
                  t: 'Upfront pay agreements',
                  d: 'Every job specifies the exact pay amount, pay basis (hourly/daily), and payout timing.',
                },
                {
                  icon: <Star className="h-5 w-5 text-brand-600" />,
                  t: 'Mutual ratings & reviews',
                  d: 'Workers and employers build credibility through feedback from completed assignments.',
                },
                {
                  icon: <CheckCircle2 className="h-5 w-5 text-brand-600" />,
                  t: 'Flagging & safety reports',
                  d: 'Anyone can flag suspicious listings or unfair behavior directly to our moderation review queue.',
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-3.5 rounded-xl border border-canvas-200 p-4 bg-canvas-50/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-ink-900">{item.t}</h4>
                    <p className="mt-1 text-xs text-ink-600 leading-relaxed">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Strong Final Call to Action */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-16">
        <Card className="overflow-hidden border-canvas-200">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 sm:p-10 flex flex-col justify-between">
              <div>
                <Badge variant="teal" size="sm" className="mb-3">For Job Seekers</Badge>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-ink-900">
                  Ready to start earning?
                </h3>
                <p className="mt-2.5 text-sm sm:text-base text-ink-600 leading-relaxed">
                  Browse nearby one-day, weekend, and part-time shifts. Apply in seconds, track your applications, and receive payment promptly.
                </p>
              </div>
              <div className="mt-6">
                <Button onClick={enterWorker} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Explore Local Jobs
                </Button>
              </div>
            </div>
            <div className="bg-ink-900 p-8 sm:p-10 text-white flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-brand-500/20 px-2.5 py-1 text-xs font-semibold text-brand-300 ring-1 ring-inset ring-brand-500/30 mb-3">
                  For Business Owners
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                  Need workers right away?
                </h3>
                <p className="mt-2.5 text-sm sm:text-base text-ink-200 leading-relaxed">
                  Post a short-term job, set your shift and rate, and review applicants from your area. Manage everything cleanly in one dashboard.
                </p>
              </div>
              <div className="mt-6">
                <Button variant="white" onClick={enterEmployer} rightIcon={<ArrowRight className="h-4 w-4 text-brand-700" />}>
                  Post a Job Opening
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 8. Polished Footer */}
      <footer className="border-t border-canvas-200 bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-canvas-100">
            <div className="flex flex-col items-center md:items-start gap-2">
              <Logo />
              <p className="text-xs text-ink-500">Hyper-local temporary work marketplace for Ahmedabad.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-semibold text-ink-600">
              <a {...linkProps('/jobs', navigate)} className="hover:text-brand-700 transition-colors">Browse Jobs</a>
              <a {...linkProps('/login', navigate)} className="hover:text-brand-700 transition-colors">Sign In</a>
              <a {...linkProps('/signup', navigate)} className="hover:text-brand-700 transition-colors">Create Account</a>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
            <p>© {new Date().getFullYear()} LocalConnect · Ahmedabad, Gujarat</p>
            <p className="text-center sm:text-right max-w-md">
              College design-thinking prototype demonstration. All jobs and profile records are sample data.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

