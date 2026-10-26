import { Compass } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export function NotFoundPage() {
  const { navigate } = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-50 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <Compass className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold font-display text-ink-900">404</h1>
        <p className="mt-2 text-ink-600">We couldn't find the page you're looking for. It may have moved or never existed.</p>
        <div className="mt-6 flex justify-center gap-2.5">
          <Button variant="outline" onClick={() => window.history.back()}>Go back</Button>
          <Button onClick={() => navigate('/')}>Back to home</Button>
        </div>
      </Card>
    </div>
  );
}
