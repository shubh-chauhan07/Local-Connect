import { useState } from 'react';
import {
  ArrowLeft, Briefcase, Building2, ShieldCheck, User as UserIcon, MailCheck, KeyRound, Loader2,
} from 'lucide-react';
import { useRouter, linkProps } from '@/lib/router';
import {
  signIn, signUpWorker, signUpEmployer, resendConfirmation, requestPasswordReset, getPendingEmail,
} from '@/data/store';
import { Logo } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, FieldWrap, Select } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { toastSuccess, toastError } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

const AREAS = ['Satellite', 'Bodakdev', 'Vastrapur', 'Prahlad Nagar', 'Ellisbridge', 'Thaltej', 'Naroda', 'Maninagar', 'Bopal', 'Asarwa'];

type AuthView = 'login' | 'signup' | 'pending' | 'forgot';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const { navigate } = useRouter();
  const [view, setView] = useState<AuthView>(mode);
  const queryParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const [role, setRole] = useState<Role>(queryParams.get('role') === 'employer' ? 'employer' : 'worker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState('Satellite');
  const [businessName, setBusinessName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>('');
  const [resetSent, setResetSent] = useState(false);

  const isSignup = view === 'signup';

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Use at least 6 characters';

    if (isSignup) {
      if (!name || name.trim().length < 2) errs.name = 'Enter your name';
      if (!phone || !/^[0-9+\-\s]{10,15}$/.test(phone)) errs.phone = 'Enter a valid phone number';
      if (role === 'employer' && (!businessName || businessName.trim().length < 2)) {
        errs.businessName = 'Business name is required';
      }
    }
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (view === 'login') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrors({ form: res.error });
          toastError(res.error);
          if (res.needsConfirmation) {
            setPendingEmail(email);
            setView('pending');
          }
        }
        // onAuthStateChange handles navigation
      } else if (view === 'signup') {
        if (role === 'worker') {
          const res = await signUpWorker(email, password, name.trim(), phone.trim(), area);
          if (res.error) { setErrors({ form: res.error }); toastError(res.error); }
          else { setPendingEmail(email); setView('pending'); toastSuccess('Account created! Check your email to confirm.'); }
        } else {
          const res = await signUpEmployer(email, password, name.trim(), businessName.trim(), phone.trim(), area);
          if (res.error) { setErrors({ form: res.error }); toastError(res.error); }
          else { setPendingEmail(email); setView('pending'); toastSuccess('Account created! Check your email to confirm.'); }
        }
      } else if (view === 'forgot') {
        const res = await requestPasswordReset(email);
        if (res.error) { setErrors({ form: res.error }); toastError(res.error); }
        else { setResetSent(true); toastSuccess('Password reset link sent to your email.'); }
      }
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    const e = pendingEmail || getPendingEmail() || email;
    if (!e) return;
    setSubmitting(true);
    try {
      const res = await resendConfirmation(e);
      if (res.error) toastError(res.error);
      else toastSuccess('Confirmation email resent. Check your inbox.');
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Could not resend the confirmation email.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Pending verification view ----------
  if (view === 'pending') {
    return (
      <div className="min-h-screen bg-canvas-50 flex flex-col">
        <header className="border-b border-canvas-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <a {...linkProps('/', navigate)} className="flex items-center gap-2 text-ink-500 hover:text-ink-800">
              <ArrowLeft className="h-4 w-4" /> Back
            </a>
            <Logo />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <Card className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <MailCheck className="h-8 w-8" />
              </div>
              <h1 className="mt-5 text-2xl font-extrabold font-display text-ink-900">Check your email</h1>
              <p className="mt-2 text-sm text-ink-600">
                We sent a confirmation link to <span className="font-semibold text-ink-900">{pendingEmail}</span>.
                Click the link to verify your account and start using LocalConnect.
              </p>
              <div className="mt-6 space-y-2.5">
                <Button variant="outline" fullWidth onClick={onResend} disabled={submitting} leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                  Resend confirmation email
                </Button>
                <Button variant="ghost" fullWidth onClick={() => setView('login')}>
                  Back to login
                </Button>
              </div>
              <p className="mt-5 text-xs text-ink-400">
                Didn't receive the email? Check your spam folder, or wait a minute and resend. The link expires after 24 hours.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Forgot password view ----------
  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-canvas-50 flex flex-col">
        <header className="border-b border-canvas-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
            <a {...linkProps('/', navigate)} className="flex items-center gap-2 text-ink-500 hover:text-ink-800">
              <ArrowLeft className="h-4 w-4" /> Back
            </a>
            <Logo />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <Card className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-2xl font-extrabold font-display text-ink-900">Reset password</h1>
                <p className="mt-1.5 text-sm text-ink-500">
                  Enter your email and we'll send you a secure link to set a new password.
                </p>
              </div>
              {resetSent ? (
                <div className="rounded-xl bg-success-50 border border-success-200 p-4 text-center">
                  <p className="text-sm font-semibold text-success-700">Reset link sent!</p>
                  <p className="mt-1 text-xs text-success-600">Check your email for the password reset link. It expires in 1 hour.</p>
                  <Button variant="outline" className="mt-4" fullWidth onClick={() => setView('login')}>Back to login</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <FieldWrap label="Email" required error={errors.email}>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.in" invalid={!!errors.email} />
                  </FieldWrap>
                  {errors.form && <p className="text-sm text-error-600">{errors.form}</p>}
                  <Button type="submit" fullWidth disabled={submitting} leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                    Send reset link
                  </Button>
                  <button type="button" onClick={() => setView('login')} className="w-full text-sm font-semibold text-brand-600 hover:text-brand-700">
                    Back to login
                  </button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Login / Signup view ----------
  return (
    <div className="min-h-screen bg-canvas-50 flex flex-col">
      <header className="border-b border-canvas-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a {...linkProps('/', navigate)} className="flex items-center gap-2 text-ink-500 hover:text-ink-800">
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
          <Logo />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold font-display text-ink-900">
              {isSignup
                ? (role === 'employer' ? 'Create employer account' : 'Create worker account')
                : (role === 'employer' ? 'Employer login' : 'Worker login')}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              {isSignup
                ? (role === 'employer'
                    ? 'Post short-term gigs and hire local verified help in Ahmedabad.'
                    : 'Find short-term shifts and gigs in Ahmedabad with upfront pay.')
                : (role === 'employer'
                    ? 'Log in to manage your job listings, shifts, and applicants.'
                    : 'Log in to apply for gigs, save jobs, and track applications.')}
            </p>
          </div>

          {/* Public browsing notice */}
          {!isSignup && (
            <Card className="p-4 mb-5 bg-brand-50/40 border-brand-200">
              <p className="text-xs text-ink-600">
                <ShieldCheck className="inline h-3.5 w-3.5 text-brand-600 mr-1" />
                Job listings are publicly browsable without an account. Log in only to apply, save jobs, or post work.
              </p>
            </Card>
          )}

          {/* Role selector */}
          <Card className="p-6 sm:p-8 rounded-3xl shadow-pop border border-canvas-200/80 bg-white">
            <div className="mb-5 flex items-center gap-1 rounded-xl bg-canvas-100 p-1">
              {(['worker', 'employer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold capitalize transition-all cursor-pointer',
                    role === r
                      ? 'bg-white text-brand-700 shadow-sm font-bold'
                      : 'text-ink-500 hover:text-ink-800 hover:bg-canvas-200/50',
                  )}
                >
                  {r === 'worker' ? <UserIcon className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {r === 'worker' ? 'Worker' : 'Employer'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {isSignup && (
                <FieldWrap label={role === 'worker' ? 'Full name' : 'Contact person name'} required error={errors.name}>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" invalid={!!errors.name} />
                </FieldWrap>
              )}
              {isSignup && role === 'employer' && (
                <FieldWrap label="Business name" required error={errors.businessName}>
                  <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Satvik Mart" invalid={!!errors.businessName} />
                </FieldWrap>
              )}
              <FieldWrap label="Email" required error={errors.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.in" invalid={!!errors.email} />
              </FieldWrap>
              {isSignup && (
                <FieldWrap label="Phone" required error={errors.phone}>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98250 12345" invalid={!!errors.phone} />
                </FieldWrap>
              )}
              {isSignup && (
                <FieldWrap label="Preferred area" required>
                  <Select value={area} onChange={(e) => setArea(e.target.value)}>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>{a}, Ahmedabad</option>
                    ))}
                  </Select>
                </FieldWrap>
              )}
              <FieldWrap label="Password" required error={errors.password}>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" invalid={!!errors.password} />
              </FieldWrap>

              {!isSignup && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setView('forgot')} className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                    Forgot password?
                  </button>
                </div>
              )}

              {errors.form && (
                <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
                  {errors.form}
                </div>
              )}

              <Button type="submit" fullWidth disabled={submitting} leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined} className="shadow-sm hover:shadow-glow font-bold">
                {isSignup ? 'Create account' : 'Log in'}
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-sm text-ink-500">
            {isSignup ? (
              <>Already have an account?{' '}
                <button onClick={() => setView('login')} className="font-semibold text-brand-600 hover:text-brand-700">Log in</button>
              </>
            ) : (
              <>New to LocalConnect?{' '}
                <button onClick={() => setView('signup')} className="font-semibold text-brand-600 hover:text-brand-700">Sign up</button>
              </>
            )}
          </p>

          <p className="mt-3 text-center text-xs text-ink-500">
            {role === 'worker' ? (
              <><Briefcase className="inline h-3.5 w-3.5 mr-1 text-brand-600" />Workers apply to gigs, track earnings, and manage shifts.</>
            ) : (
              <><Building2 className="inline h-3.5 w-3.5 mr-1 text-brand-600" />Employers post short-term gigs and review worker applicants.</>
            )}
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <Badge variant="neutral" size="sm"><ShieldCheck className="h-3 w-3" /> Email verified</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
