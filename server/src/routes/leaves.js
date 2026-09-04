import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('student'));

async function getStudentIdOrThrow(userId, res) {
  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !student) {
    res.status(404).json({ error: 'Student profile not found' });
    return null;
  }
  return student.id;
}

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

router.get('/', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: rows, error } = await supabase
      .from('leaves')
      .select('id, leave_type, start_date, end_date, reason, status, rejection_reason, applied_at')
      .eq('student_id', studentId)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    const withDays = (rows || []).map((r) => ({
      id: r.id,
      leaveType: r.leave_type,
      startDate: r.start_date,
      endDate: r.end_date,
      reason: r.reason,
      status: r.status,
      rejectionReason: r.rejection_reason,
      appliedAt: r.applied_at,
      days: daysBetween(r.start_date, r.end_date),
    }));

    res.status(200).json(withDays);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: row, error } = await supabase
      .from('leaves')
      .select('id, leave_type, start_date, end_date, reason, status, rejection_reason, applied_at, qr_code, checked_out_at, checked_in_at')
      .eq('id', req.params.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return res.status(404).json({ error: 'Leave request not found' });

    const qrCode = row.status === 'approved' ? row.qr_code : null;

    res.status(200).json({
      id: row.id,
      leaveType: row.leave_type,
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      rejectionReason: row.rejection_reason,
      appliedAt: row.applied_at,
      qrCode,
      checkedOutAt: row.checked_out_at,
      checkedInAt: row.checked_in_at,
      days: daysBetween(row.start_date, row.end_date),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { leaveType, startDate, endDate, reason } = req.body || {};
    const errors = {};
    if (!leaveType) errors.leaveType = 'Leave type is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (!reason || !reason.trim()) errors.reason = 'Reason is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End date cannot be before start date';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const { data: created, error } = await supabase
      .from('leaves')
      .insert({
        student_id: studentId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
        status: 'pending',
      })
      .select('id, leave_type, start_date, end_date, reason, status, applied_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: created.id,
      leaveType: created.leave_type,
      startDate: created.start_date,
      endDate: created.end_date,
      reason: created.reason,
      status: created.status,
      appliedAt: created.applied_at,
      days: daysBetween(created.start_date, created.end_date),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: leave, error: lErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', req.params.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (lErr) throw lErr;
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (!['pending'].includes(leave.status)) {
      return res.status(400).json({ error: `Cannot cancel a leave request with status "${leave.status}"` });
    }

    const { error: updErr } = await supabase
      .from('leaves')
      .update({
        status: 'cancelled',
        decided_at: new Date().toISOString(),
      })
      .eq('id', leave.id);

    if (updErr) throw updErr;

    res.status(200).json({ id: leave.id, status: 'cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
