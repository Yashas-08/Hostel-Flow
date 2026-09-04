import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { FieldWrap, Input, Select, Textarea } from '../../components/primitives';
import type { LeaveRequest } from '../../types';

const LEAVE_TYPES = ['Home Visit', 'Medical', 'Personal', 'Emergency', 'Other'];

export default function LeaveApplyPage() {
  const navigate = useNavigate();
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const errors: Record<string, string> = {};
    if (!leaveType) errors.leaveType = 'Select a leave type';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End date cannot be before start date';
    }
    if (!reason.trim()) errors.reason = 'Reason is required';
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await api.post<LeaveRequest>('/leaves', { leaveType, startDate, endDate, reason: reason.trim() });
      navigate(`/student/leave/${created.id}`, { replace: true, state: { justSubmitted: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields || {});
        setFormError(err.fields ? '' : err.message);
      } else {
        setFormError('Could not submit your leave request. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <div className="pt-[calc(env(safe-area-inset-top)+18px)] pb-5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="h-9 w-9 flex items-center justify-center rounded-full border border-[var(--color-border)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <h1 className="font-display font-bold text-lg text-[var(--color-ink)]">Apply for leave</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FieldWrap label="Leave type" error={fieldErrors.leaveType}>
          <Select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} error={fieldErrors.leaveType}>
            <option value="">Select type</option>
            {LEAVE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </FieldWrap>

        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Start date" error={fieldErrors.startDate}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={fieldErrors.startDate} />
          </FieldWrap>
          <FieldWrap label="End date" error={fieldErrors.endDate}>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} error={fieldErrors.endDate} />
          </FieldWrap>
        </div>

        <FieldWrap label="Reason" error={fieldErrors.reason}>
          <Textarea
            placeholder="Briefly explain the reason for your leave"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={fieldErrors.reason}
          />
        </FieldWrap>

        {formError && (
          <p role="alert" className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-soft)] rounded-[var(--radius-sm)] px-3 py-2">
            {formError}
          </p>
        )}

        <Button type="submit" fullWidth loading={submitting}>
          Submit request
        </Button>
      </form>
    </Screen>
  );
}
