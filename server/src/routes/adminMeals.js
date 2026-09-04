import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };

// POST /api/admin/meals/verify  { qrCode, expectedGender? }
router.post('/verify', async (req, res, next) => {
  try {
    const { qrCode, expectedGender } = req.body || {};
    if (!qrCode || typeof qrCode !== 'string' || !qrCode.trim()) {
      return res.status(400).json({ error: 'No QR code data received' });
    }
    if (expectedGender && !['male', 'female'].includes(expectedGender)) {
      return res.status(400).json({ error: 'Invalid expectedGender' });
    }

    const { data: booking, error } = await supabase
      .from('meal_bookings')
      .select(`
        *,
        student:students!inner(
          student_code,
          user:users!inner(full_name, gender)
        )
      `)
      .eq('qr_code', qrCode.trim())
      .maybeSingle();

    if (error) throw error;
    if (!booking) {
      return res.status(404).json({ error: 'Invalid QR code — no matching booking found' });
    }

    const studentName = booking.student.user.full_name;
    const studentGender = booking.student.user.gender;
    const studentCode = booking.student.student_code;

    if (expectedGender && studentGender !== expectedGender) {
      const scannerLabel = expectedGender === 'female' ? 'Girls Mess' : 'Boys Mess';
      return res.status(403).json({
        error: `This QR belongs to a different gender's student — not valid at the ${scannerLabel} scanner`,
        studentName,
      });
    }

    if (booking.status === 'consumed') {
      return res.status(409).json({
        error: 'This meal has already been used',
        consumedAt: booking.consumed_at,
        studentName,
        mealType: booking.meal_type,
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'This booking was cancelled' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (booking.date !== todayStr) {
      return res.status(400).json({
        error: `This QR is for ${booking.date}, not today`,
        studentName,
        mealType: booking.meal_type,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from('meal_bookings')
      .update({
        status: 'consumed',
        consumed_at: nowIso,
      })
      .eq('id', booking.id);

    if (updErr) throw updErr;

    res.status(200).json({
      status: 'consumed',
      studentName,
      studentCode,
      mealType: booking.meal_type,
      mealLabel: MEAL_LABEL[booking.meal_type],
      date: booking.date,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
