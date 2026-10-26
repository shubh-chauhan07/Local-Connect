import { useState } from 'react';
import { KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useRouter, linkProps } from '@/lib/router';
import { updatePassword, signOut } from '@/data/store';
import { Logo } from '@/components/shared';
import { Button } from '@/components/ui/Button';
import { Input, FieldWrap } from '@/components/ui/Field';
import { Card } from '@/components/ui/Card';
import { toastSuccess, toastError } from '@/components/ui/Toast';

export function ResetPasswordPage() {
  const { navigate } = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    const res = await updatePassword(password);
    setSubmitting(false);
    if (res.error) { setError(res.error); toastError(res.error); return; }
    setDone(true);
    toastSuccess('Password updated! You can now log in with your new password.');
    await signOut();
    setTimeout(() => navigate('/login'), 2000);
  };

  return (
    <div className="min-h-screen bg-canvas-50 flex flex-col">
      <header className="border-b border-canvas-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a {...linkProps('/', navigate)} className="flex items-center gap-2 text-ink-500 hover:text-ink-800">
            <Logo />
          </a>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="p-8">
            <div className="text-center mb-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-extrabold font-display text-ink-900">Set new password</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                {done ? 'Your password has been updated. Redirecting to login...' : 'Enter a new password for your LocalConnect account.'}
              </p>
            </div>
            {!done && (
              <form onSubmit={submit} className="space-y-4">
                <FieldWrap label="New password" required error={password.length > 0 && password.length < 6 ? 'At least 6 characters' : null}>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" invalid={!!password && password.length < 6} />
                </FieldWrap>
                <FieldWrap label="Confirm password" required error={!!confirm && confirm !== password ? 'Passwords do not match' : null}>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" invalid={!!confirm && confirm !== password} />
                </FieldWrap>
                {error && <p className="text-sm text-error-600">{error}</p>}
                <Button type="submit" fullWidth disabled={submitting} leftIcon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>
                  Update password
                </Button>
              </form>
            )}
            {done && (
              <div className="rounded-xl bg-success-50 border border-success-200 p-4 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-success-600" />
                <p className="mt-2 text-sm font-semibold text-success-700">Password updated successfully</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
