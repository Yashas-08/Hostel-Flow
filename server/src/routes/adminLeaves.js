import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

// GET /api/admin/leaves?status=&q=
router.get('/', async (req, res, next) => {
  try {
    const { status, q } = req.query;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    let query = supabase
      .from('leaves')
      .select(`
        id, leave_type, start_date, end_date, reason, status, applied_at,
        student:students!inner(
          id, student_code,
          user:users!inner(full_name)
        )
      `)
      .order('applied_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let list = (rows || []).map((l) => ({
      id: l.id,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      appliedAt: l.applied_at,
      studentId: l.student.id,
      studentCode: l.student.student_code,
      studentName: l.student.user.full_name,
      days: daysBetween(l.start_date, l.end_date),
    }));

    if (q && String(q).trim()) {
      const filter = String(q).trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.studentName.toLowerCase().includes(filter) ||
          item.studentCode.toLowerCase().includes(filter)
      );
    }

    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/leaves/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data: l, error } = await supabase
      .from('leaves')
      .select(`
        id, leave_type, start_date, end_date, reason, status, rejection_reason, applied_at,
        decided_at, checked_out_at, checked_in_at,
        student:students!inner(
          id, student_code,
          user:users!inner(full_name)
        )
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!l) return res.status(404).json({ error: 'Leave request not found' });

    res.status(200).json({
      id: l.id,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      rejectionReason: l.rejection_reason,
      appliedAt: l.applied_at,
      decidedAt: l.decided_at,
      checkedOutAt: l.checked_out_at,
      checkedInAt: l.checked_in_at,
      studentId: l.student.id,
      studentCode: l.student.student_code,
      studentName: l.student.user.full_name,
      days: daysBetween(l.start_date, l.end_date),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/leaves/:id/approve
router.patch('/:id/approve', async (req, res, next) => {
  try {
    const { data: leave, error: lErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (lErr) throw lErr;
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve a leave request with status "${leave.status}"` });
    }

    const qrCode = `LEAVE-${crypto.randomUUID()}`;
    const { error: updErr } = await supabase
      .from('leaves')
      .update({
        status: 'approved',
        decided_at: new Date().toISOString(),
        qr_code: qrCode,
      })
      .eq('id', leave.id);

    if (updErr) throw updErr;
    res.status(200).json({ id: leave.id, status: 'approved' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/leaves/:id/reject  { reason }
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const { data: leave, error: lErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (lErr) throw lErr;
    if (!leave) return res.status(404).json({ error: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject a leave request with status "${leave.status}"` });
    }

    const { reason } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Validation failed', fields: { reason: 'A rejection reason is required' } });
    }

    const { error: updErr } = await supabase
      .from('leaves')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
        decided_at: new Date().toISOString(),
      })
      .eq('id', leave.id);

    if (updErr) throw updErr;
    res.status(200).json({ id: leave.id, status: 'rejected', rejectionReason: reason.trim() });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/leaves/verify-checkout  { qrCode }
router.post('/verify-checkout', async (req, res, next) => {
  try {
    const { qrCode } = req.body || {};
    if (!qrCode || typeof qrCode !== 'string' || !qrCode.trim()) {
      return res.status(400).json({ error: 'No QR code data received' });
    }

    const { data: leave, error } = await supabase
      .from('leaves')
      .select(`
        *,
        student:students!inner(
          student_code,
          user:users!inner(full_name)
        )
      `)
      .eq('qr_code', qrCode.trim())
      .maybeSingle();

    if (error) throw error;
    if (!leave) {
      return res.status(404).json({ error: 'Invalid QR code no matching leave found' });
    }

    const studentName = leave.student.user.full_name;
    const studentCode = leave.student.student_code;

    if (leave.status !== 'approved') {
      return res.status(400).json({ error: `This leave is ${leave.status}, not approved`, studentName });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (todayStr < leave.start_date) {
      return res.status(400).json({ error: `This leave doesn't start until ${leave.start_date}`, studentName });
    }

    if (leave.checked_out_at) {
      return res.status(409).json({
        error: 'This student has already checked out for this leave',
        studentName,
        checkedOutAt: leave.checked_out_at,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('leaves')
      .update({ checked_out_at: nowIso })
      .eq('id', leave.id);

    if (updErr) throw updErr;

    res.status(200).json({
      status: 'checked_out',
      studentName,
      studentCode,
      leaveType: leave.leave_type,
      checkedOutAt: nowIso,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/leaves/verify-checkin  { qrCode }
router.post('/verify-checkin', async (req, res, next) => {
  try {
    const { qrCode } = req.body || {};
    if (!qrCode || typeof qrCode !== 'string' || !qrCode.trim()) {
      return res.status(400).json({ error: 'No QR code data received' });
    }

    const { data: leave, error } = await supabase
      .from('leaves')
      .select(`
        *,
        student:students!inner(
          student_code,
          user:users!inner(full_name)
        )
      `)
      .eq('qr_code', qrCode.trim())
      .maybeSingle();

    if (error) throw error;
    if (!leave) {
      return res.status(404).json({ error: 'Invalid QR code no matching leave found' });
    }

    const studentName = leave.student.user.full_name;
    const studentCode = leave.student.student_code;

    if (!leave.checked_out_at) {
      return res.status(400).json({ error: 'This student has not checked out yet', studentName });
    }
    if (leave.checked_in_at) {
      return res.status(409).json({
        error: 'This student has already checked back in',
        studentName,
        checkedInAt: leave.checked_in_at,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('leaves')
      .update({ checked_in_at: nowIso })
      .eq('id', leave.id);

    if (updErr) throw updErr;

    res.status(200).json({
      status: 'checked_in',
      studentName,
      studentCode,
      leaveType: leave.leave_type,
      checkedInAt: nowIso,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
