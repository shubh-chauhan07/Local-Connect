import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FieldWrap, Textarea, Select } from '@/components/ui/Field';
import { Flag } from 'lucide-react';
import { createReport } from '@/data/store';
import { toastSuccess } from '@/components/ui/Toast';

const JOB_REASONS = [
  'Misleading job details',
  'Inappropriate or unsafe request',
  'Pay does not match description',
  'Suspicious or fraudulent posting',
  'Discriminatory content',
  'Other',
];

const USER_REASONS = [
  'Inappropriate behaviour',
  'Misrepresenting identity',
  'Spam or repeated contact',
  'Suspicious or fraudulent profile',
  'Other',
];

export function useReportDialog(reporterUserId: string | null) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<{ type: 'job' | 'user'; id: string; label: string } | null>(null);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);

  const openFor = (type: 'job' | 'user', id: string, label: string) => {
    if (!reporterUserId) return;
    setTarget({ type, id, label });
    setReason('');
    setDetails('');
    setError(null);
    setOpen(true);
  };

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!target || !reporterUserId) return;
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    if (details.trim().length < 10) {
      setError('Please provide a few details (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    try {
      await createReport(reporterUserId, target.type, target.id, reason, details.trim());
      toastSuccess('Report submitted. The moderation team will review it.');
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const dialog = (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={
        <span className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-error-500" />
          Report {target?.type === 'job' ? 'job' : 'user'}
        </span>
      }
      description={target ? `Reporting: ${target.label}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={submitting} loading={submitting}>
            Submit report
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldWrap label="Reason" required>
          <Select value={reason} onChange={(e) => setReason(e.target.value)} invalid={!!error && !reason}>
            <option value="">Select a reason</option>
            {(target?.type === 'job' ? JOB_REASONS : USER_REASONS).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FieldWrap>
        <FieldWrap label="Details" required error={error}>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Explain what's wrong so the moderation team can review."
            rows={4}
            invalid={!!error}
          />
        </FieldWrap>
        <p className="rounded-lg bg-canvas-100 px-3 py-2 text-xs text-ink-500">
          Reports are reviewed in the demo admin moderation screen. Contact details are not shared with the reported party.
        </p>
      </div>
    </Modal>
  );

  return { openFor, dialog };
}
