import { useState } from 'react';
import {
  Search, MapPin, ShieldCheck, Wallet, ArrowRight, Briefcase,
  Star, CheckCircle2, Sparkles, TrendingUp, Users, Clock,
} from 'lucide-react';
import { useRouter, linkProps } from '@/lib/router';
import { useDB } from '@/data/store';
import { Logo, CategoryIcon } from '@/components/shared';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CATEGORY_LABELS, PAY_BASIS_LABELS, type JobCategory } from '@/types';
import { formatINR } from '@/lib/utils';

const categories: JobCategory[] = [
  'retail', 'event_support', 'packing', 'delivery', 'restaurant', 'warehouse', 'office_support',
];

const AHMEDABAD_AREAS = ['Satellite', 'Bodakdev', 'Vastrapur', 'Prahlad Nagar', 'Navrangpura', 'Maninagar'];

export function LandingPage() {
  const db = useDB();
  const { navigate } = useRouter();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('');

  const publishedJobs = db.jobs.filter((j) => j.status === 'published');
  const featured = publishedJobs.slice(0, 6);

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
    <div className="min-h-screen bg-canvas-50 selection:bg-brand-100 selection:text-brand-900">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 py-1.5 px-4 text-center text-xs font-medium text-white/90">
        <span className="inline-flex items-center gap-1.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Ahmedabad Prototype Demo · Direct shift matching with zero commission</span>
        </span>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-canvas-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-ink-600">
            <a {...linkProps('/jobs', navigate)} className="hover:text-brand-700 transition-colors">Browse Shifts</a>
            <a {...linkProps('/login', navigate)} className="hover:text-brand-700 transition-colors">Log in</a>
            <a {...linkProps('/signup', navigate)} className="hover:text-brand-700 transition-colors">Create account</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={enterWorker} className="hidden sm:inline-flex font-semibold text-ink-700 hover:text-brand-700">
              Find work
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={enterEmployer}
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="shadow-sm hover:shadow-glow transition-all"
            >
              Hire workers
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-6 pb-16 sm:py-20 lg:py-24">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-brand-200/40 via-teal-100/30 to-canvas-50 blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/4 right-0 w-[400px] h-[300px] bg-emerald-200/25 blur-3xl pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              {/* City Pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-800 shadow-sm ring-1 ring-canvas-200 mb-6">
                <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-ping" />
                <MapPin className="h-3.5 w-3.5 text-brand-600" />
                <span>Ahmedabad · Hyper-Local Shift Network</span>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
                  {publishedJobs.length} active shifts
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-ink-900 leading-[1.08]">
                Find verified local work for a{' '}
                <span className="bg-gradient-to-r from-brand-600 via-teal-600 to-brand-700 bg-clip-text text-transparent">
                  day, weekend, or event
                </span>.
              </h1>

              <p className="mt-6 text-base sm:text-lg text-ink-600 max-w-xl leading-relaxed">
                LocalConnect matches Ahmedabad workers with neighborhood shops, retail counters, catering events, delivery hubs, and warehouses. Upfront pay, verified businesses, same-day settlement.
              </p>

              {/* Elevated Search Card */}
              <div className="mt-8 rounded-2xl bg-white p-3.5 shadow-pop border border-canvas-200/80 ring-1 ring-ink-900/5">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Role (e.g. Counter Sales, Packer, Usher)"
                      className="pl-10 h-11 border-canvas-200 focus:border-brand-500 text-sm"
                      aria-label="Search jobs"
                    />
                  </div>
                  <div className="relative sm:w-56">
                    <MapPin className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-600" />
                    <Input
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && search()}
                      placeholder="Area (Satellite, Vastrapur…)"
                      className="pl-10 h-11 border-canvas-200 focus:border-brand-500 text-sm"
                      aria-label="Area"
                    />
                  </div>
                  <Button
                    onClick={() => search()}
                    leftIcon={<Search className="h-4 w-4" />}
                    className="h-11 px-5 shadow-sm hover:shadow-glow transition-all"
                  >
                    Find Work
                  </Button>
                </div>

                {/* Quick Area Filter Pills */}
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-canvas-100 pt-3 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">Quick areas:</span>
                  {AHMEDABAD_AREAS.map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setArea(a);
                        search({ area: a });
                      }}
                      className="rounded-lg bg-canvas-100/80 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200 px-2.5 py-1 font-medium text-ink-700 ring-1 ring-inset ring-canvas-200 transition-colors"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Proof Stack */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-ink-600">
                <div className="flex -space-x-2">
                  {['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'].map((c, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-[10px] text-white shadow-sm"
                      style={{ backgroundColor: c }}
                    >
                      {['VK', 'RS', 'AP', 'MC'][i]}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <div className="flex text-warning-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="font-bold text-ink-900">4.9/5</span>
                  <span className="text-ink-400">·</span>
                  <span>Rated by 1,200+ workers & shop owners in Ahmedabad</span>
                </div>
              </div>
            </div>

            {/* Live Shift Radar Preview */}
            <div className="lg:col-span-5 hidden lg:block">
              <div className="relative">
                {/* Decorative border glow */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-brand-400/20 via-teal-300/20 to-accent-300/20 blur-xl opacity-70" />
                <Card className="relative p-5 bg-white/95 backdrop-blur-md border border-canvas-200 shadow-cardHover">
                  <div className="flex items-center justify-between pb-3.5 border-b border-canvas-100">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-sm font-bold text-ink-800">Live Shifts Radar</span>
                    </div>
                    <Badge variant="teal" size="sm">
                      Ahmedabad Today
                    </Badge>
                  </div>

                  <div className="mt-3.5 space-y-2.5">
                    {featured.slice(0, 4).map((job) => {
                      const employer = db.employerProfiles.find((e) => e.id === job.employerId);
                      return (
                        <div
                          key={job.id}
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="group flex items-center gap-3 rounded-xl border border-canvas-100 p-3 hover:border-brand-200 hover:bg-brand-50/30 transition-all cursor-pointer"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-teal-50 text-brand-600 ring-1 ring-brand-200/50 group-hover:scale-105 transition-transform">
                            <CategoryIcon category={job.category} className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                              {job.title}
                            </p>
                            <p className="truncate text-xs text-ink-500">
                              {employer?.businessName} · <span className="font-medium text-ink-700">{job.area}</span>
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-extrabold text-brand-600">
                              {formatINR(job.payAmount)}
                            </p>
                            <p className="text-[10px] font-medium text-ink-400">
                              {PAY_BASIS_LABELS[job.payBasis]}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-canvas-100">
                    <Button
                      variant="subtle"
                      fullWidth
                      onClick={enterWorker}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      className="font-bold text-brand-700 hover:bg-brand-100"
                    >
                      Browse all {publishedJobs.length} active jobs
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Strip */}
      <section className="border-y border-canvas-200/80 bg-white/90 backdrop-blur-sm py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-400">Explore by Job Category</h2>
            </div>
            <button
              onClick={() => navigate('/jobs')}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors"
            >
              View all categories →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {categories.map((cat) => {
              const count = publishedJobs.filter((j) => j.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => navigate(`/jobs?category=${cat}`)}
                  className="group flex flex-col items-center gap-2 rounded-2xl border border-canvas-200/70 p-4 text-center hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-sm transition-all duration-200"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-50 to-brand-50 text-teal-700 ring-1 ring-teal-200/60 group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <CategoryIcon category={cat} className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-bold text-ink-800 leading-tight group-hover:text-brand-700 transition-colors">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <span className="rounded-full bg-canvas-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500 group-hover:bg-brand-100 group-hover:text-brand-800 transition-colors">
                    {count} open
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="brand" className="mb-2">
              <Sparkles className="h-3 w-3" /> Handpicked Shifts
            </Badge>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-ink-900 tracking-tight">
              Featured local jobs in Ahmedabad
            </h2>
            <p className="mt-1.5 text-sm sm:text-base text-ink-500">
              Clear requirements, guaranteed transparent wages, and flexible short hours.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={enterWorker}
            rightIcon={<ArrowRight className="h-4 w-4" />}
            className="self-start sm:self-auto shrink-0 font-semibold"
          >
            Explore all {publishedJobs.length} jobs
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              db={db}
              onOpen={() => navigate(`/jobs/${job.id}`)}
            />
          ))}
        </div>
      </section>

      {/* How It Works - Numbered Modern Steps */}
      <section className="bg-white border-y border-canvas-200 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <Badge variant="teal" className="mb-3">
              Simple 3-Step Process
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-ink-900">
              How LocalConnect works
            </h2>
            <p className="mt-2.5 text-base text-ink-500">
              Built for instant matching between reliable local workers and neighborhood businesses. Zero middleman cuts.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Find nearby shifts',
                desc: 'Filter verified jobs by neighborhood, category, hours, and pay basis. See exactly what you will earn before applying.',
                icon: <Search className="h-6 w-6" />,
              },
              {
                step: '02',
                title: 'Apply in 10 seconds',
                desc: 'No lengthy CV needed. Send your profile and availability with one tap. Employers review and respond rapidly.',
                icon: <Briefcase className="h-6 w-6" />,
              },
              {
                step: '03',
                title: 'Complete shift & get paid',
                desc: 'Work the agreed hours, build your local reputation rating, and receive payment at shift completion as promised.',
                icon: <Wallet className="h-6 w-6" />,
              },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-canvas-200 bg-canvas-50/50 p-7 hover:border-brand-300 hover:shadow-cardHover transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm group-hover:scale-105 transition-transform">
                    {s.icon}
                  </div>
                  <span className="text-3xl font-black font-display text-ink-200 group-hover:text-brand-300 transition-colors">
                    {s.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-ink-900 group-hover:text-brand-700 transition-colors">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-ink-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety Showcase */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <Badge variant="brand" className="mb-3">
              <ShieldCheck className="h-3 w-3" /> Trust & Verification
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-ink-900 tracking-tight leading-tight">
              Safety, fair pay, and transparency built into every shift.
            </h2>
            <p className="mt-3 text-base text-ink-600">
              Unlike anonymous classified ads, LocalConnect establishes trust on both sides of every shift.
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  icon: <ShieldCheck className="h-5 w-5 text-brand-600" />,
                  title: 'Demo Verified Businesses',
                  desc: 'Trusted employers earn a verification badge so workers know they are showing up to a genuine establishment.',
                },
                {
                  icon: <Wallet className="h-5 w-5 text-brand-600" />,
                  title: 'Guaranteed Transparent Wages',
                  desc: 'Every single listing specifies the exact pay amount, basis (hourly, daily, or per task), and settlement timing.',
                },
                {
                  icon: <Star className="h-5 w-5 text-brand-600" />,
                  title: 'Two-Way Ratings & Reviews',
                  desc: 'Build your credibility with honest reviews from past shifts. Good work leads to more job invites.',
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3.5 items-start">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 ring-1 ring-brand-200/60 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-900 text-sm">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-ink-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-3xl bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-8 sm:p-10 text-white shadow-pop">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-white/15 mb-4">
                <Users className="h-3.5 w-3.5" /> For Shop Owners & Event Organizers
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold font-display text-white">
                Need reliable staff for today or this weekend?
              </h3>
              <p className="mt-3 text-sm text-ink-200 leading-relaxed">
                Post an urgent opening in 2 minutes. Receive applications from vetted workers nearby, review their ratings, and confirm candidates in real time.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  'Quick shift posting with pre-set skill tags',
                  'Direct applicant tracking with 1-tap accept/shortlist',
                  'Instant visibility across Ahmedabad neighborhoods',
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-ink-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={enterEmployer}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  className="shadow-glow font-bold"
                >
                  Post a Shift Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login?role=employer')}
                  className="border-white/30 text-white hover:bg-white/10"
                >
                  Employer Login
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual CTA Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Worker CTA */}
          <div className="rounded-3xl border border-canvas-200 bg-white p-8 sm:p-10 shadow-card hover:shadow-cardHover transition-all flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-200 mb-5">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black font-display text-ink-900">
                Ready to earn on your own schedule?
              </h3>
              <p className="mt-2.5 text-sm text-ink-600 leading-relaxed">
                Browse open short-term gigs across Ahmedabad. No fees, no commitments — apply to shifts that fit your time and skills.
              </p>
            </div>
            <div className="mt-8">
              <Button
                variant="primary"
                onClick={enterWorker}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="w-full sm:w-auto font-bold"
              >
                Browse Shifts & Apply
              </Button>
            </div>
          </div>

          {/* Employer CTA */}
          <div className="rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-700 p-8 sm:p-10 text-white shadow-pop flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20 mb-5">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-black font-display text-white">
                Short on staff for an upcoming rush?
              </h3>
              <p className="mt-2.5 text-sm text-brand-50/90 leading-relaxed">
                Connect with ready-to-work local talent in Satellite, Bodakdev, Vastrapur, and beyond. Post jobs and hire in minutes.
              </p>
            </div>
            <div className="mt-8">
              <Button
                variant="white"
                onClick={enterEmployer}
                rightIcon={<ArrowRight className="h-4 w-4 text-brand-700" />}
                className="w-full sm:w-auto font-bold shadow-md"
              >
                Hire Reliable Workers
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-canvas-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center md:items-start gap-2">
              <Logo />
              <p className="text-xs text-ink-500 max-w-md text-center md:text-left mt-1">
                Hyper-local flexible work marketplace for Ahmedabad. Connecting workers with shops, events, and warehouses.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-semibold text-ink-600">
              <a {...linkProps('/jobs', navigate)} className="hover:text-brand-700 transition-colors">Find Jobs</a>
              <a {...linkProps('/login', navigate)} className="hover:text-brand-700 transition-colors">Log In</a>
              <a {...linkProps('/signup', navigate)} className="hover:text-brand-700 transition-colors">Sign Up</a>
              <a {...linkProps('/about', navigate)} className="hover:text-brand-700 transition-colors">About Prototype</a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-canvas-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-400">
            <p>© {new Date().getFullYear()} LocalConnect · Design Thinking Academic Prototype</p>
            <p>All job listings, profiles, and businesses are sample data for demonstration.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
