import { Bell, CheckCheck, Briefcase, FileText, Bookmark, ShieldAlert, Info } from 'lucide-react';
import { useDB, useSession, getNotificationsForUser, markNotificationRead, markAllNotificationsRead } from '@/data/store';
import { useRouter } from '@/lib/router';
import { Card, EmptyState, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatRelative } from '@/lib/utils';
import { toastError } from '@/components/ui/Toast';

const typeIcon = {
  application_received: <Briefcase className="h-4 w-4" />,
  application_status: <FileText className="h-4 w-4" />,
  job_status_changed: <Info className="h-4 w-4" />,
  saved_job: <Bookmark className="h-4 w-4" />,
  report_update: <ShieldAlert className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
};

export function NotificationsPage() {
  const db = useDB();
  const [session] = useSession();
  const { navigate } = useRouter();
  const userId = session.userId ?? '';
  const items = userId ? getNotificationsForUser(db, userId) : [];
  const unread = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead(userId);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Could not mark notifications as read.');
    }
  };

  const openNotification = async (id: string, link?: string) => {
    try {
      await markNotificationRead(id);
    } catch (error) {
      toastError(error instanceof Error ? error.message : 'Could not mark notification as read.');
    }
    if (link) navigate(link);
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        action={unread > 0 ? <Button variant="outline" size="sm" leftIcon={<CheckCheck className="h-4 w-4" />} onClick={() => { void markAllRead(); }}>Mark all read</Button> : undefined}
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="h-7 w-7" />} title="No notifications yet" description="Application updates, job status changes, and other alerts will show up here." />
        </Card>
      ) : (
        <Card className="divide-y divide-canvas-100">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => { void openNotification(n.id, n.link); }}
              className={`flex w-full items-start gap-3 p-4 text-left hover:bg-canvas-50 transition-colors ${!n.read ? 'bg-brand-50/30' : ''}`}
            >
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${!n.read ? 'bg-brand-100 text-brand-700' : 'bg-canvas-100 text-ink-400'}`}>
                {typeIcon[n.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-900 text-sm">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </div>
                <p className="mt-0.5 text-sm text-ink-600">{n.body}</p>
                <p className="mt-1 text-xs text-ink-400">{formatRelative(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}
