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

// POST /api/attendance/check-in
router.post('/check-in', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { code } = req.body || {};
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'No QR code data received' });
    }

    const { data: checkpoint, error: cpErr } = await supabase
      .from('qr_checkpoints')
      .select('*')
      .eq('code', code.trim())
      .eq('is_active', 1)
      .maybeSingle();

    if (cpErr) throw cpErr;
    if (!checkpoint) {
      return res.status(404).json({ error: 'This QR code is not recognized. Point your camera at a valid hostel check-in QR.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const { data: existing, error: exErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', todayStr)
      .maybeSingle();

    if (exErr) throw exErr;
    if (existing) {
      return res.status(409).json({
        error: 'You have already checked in today',
        checkedInAt: existing.checked_in_at,
      });
    }

    const nowIso = new Date().toISOString();
    const { data: created, error: insErr } = await supabase
      .from('attendance')
      .insert({
        student_id: studentId,
        date: todayStr,
        status: 'present',
        checked_in_at: nowIso,
        qr_ref: checkpoint.code,
      })
      .select('id, status, checked_in_at')
      .single();

    if (insErr) {
      if (insErr.code === '23505') {
        return res.status(409).json({ error: 'You have already checked in today' });
      }
      throw insErr;
    }

    res.status(201).json({
      id: created.id,
      status: created.status,
      checkedInAt: created.checked_in_at,
      checkpointLabel: checkpoint.label,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/me/today
router.get('/me/today', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const { data: today, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', todayStr)
      .maybeSingle();

    if (error) throw error;
    if (!today) return res.status(200).json({ checkedIn: false });

    res.status(200).json({
      checkedIn: true,
      checkedInAt: today.checked_in_at,
      status: today.status,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
