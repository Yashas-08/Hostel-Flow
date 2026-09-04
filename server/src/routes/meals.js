import { Router } from 'express';
import crypto from 'crypto';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('student'));

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const MEAL_INFO = {
  breakfast: { label: 'Breakfast', timeLabel: '6:00 AM – 7:00 AM' },
  lunch: { label: 'Lunch', timeLabel: '7:00 AM – 5:00 PM' },
  dinner: { label: 'Dinner', timeLabel: '8:00 PM – 8:15 PM' },
};

const BOOKING_WINDOW_START_HOUR = 6;
const BOOKING_WINDOW_END_HOUR = 19;

function isWithinBookingWindow(now = new Date()) {
  const hour = now.getHours();
  return hour >= BOOKING_WINDOW_START_HOUR && hour < BOOKING_WINDOW_END_HOUR;
}

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

function dayLabel(dateStr, todayStr, tomorrowStr, yesterdayStr) {
  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return dateStr;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

// GET /api/meals
router.get('/', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const now = new Date();
    const today = formatDate(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = formatDate(yesterdayDate);
    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const { data: bookings, error } = await supabase
      .from('meal_bookings')
      .select('date, meal_type, status, qr_code, id')
      .eq('student_id', studentId)
      .in('date', [yesterday, today, tomorrow]);

    if (error) throw error;

    const bookingMap = new Map((bookings || []).map((b) => [`${b.date}:${b.meal_type}`, b]));
    const bookingWindowOpen = isWithinBookingWindow();

    const days = [yesterday, today, tomorrow].map((date) => ({
      date,
      label: dayLabel(date, today, tomorrow, yesterday),
      meals: MEAL_TYPES.map((mealType) => {
        const booking = bookingMap.get(`${date}:${mealType}`);
        return {
          mealType,
          label: MEAL_INFO[mealType].label,
          timeLabel: MEAL_INFO[mealType].timeLabel,
          booked: !!booking,
          status: booking ? booking.status : null,
          bookingId: booking ? booking.id : null,
          bookable: date === tomorrow && bookingWindowOpen && !booking,
        };
      }),
    }));

    res.status(200).json({ days, bookingWindowOpen });
  } catch (err) {
    next(err);
  }
});

// GET /api/meals/:id
router.get('/:id', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: booking, error } = await supabase
      .from('meal_bookings')
      .select('id, date, meal_type, status, qr_code, booked_at, consumed_at')
      .eq('id', req.params.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw error;
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    res.status(200).json({
      id: booking.id,
      date: booking.date,
      mealType: booking.meal_type,
      status: booking.status,
      qrCode: booking.qr_code,
      bookedAt: booking.booked_at,
      consumedAt: booking.consumed_at,
      label: MEAL_INFO[booking.meal_type].label,
      timeLabel: MEAL_INFO[booking.meal_type].timeLabel,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/meals/book  { mealType }
router.post('/book', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { mealType } = req.body || {};
    if (!mealType || !MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: 'Validation failed', fields: { mealType: 'Select a valid meal' } });
    }

    if (!isWithinBookingWindow()) {
      return res.status(400).json({ error: 'Meal bookings are only open between 6:00 AM and 7:00 PM' });
    }

    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = formatDate(tomorrowDate);

    const { data: existing } = await supabase
      .from('meal_bookings')
      .select('id')
      .eq('student_id', studentId)
      .eq('date', tomorrow)
      .eq('meal_type', mealType)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: `You've already booked ${MEAL_INFO[mealType].label.toLowerCase()} for tomorrow` });
    }

    const qrCode = `MEAL-${crypto.randomUUID()}`;

    const { data: created, error } = await supabase
      .from('meal_bookings')
      .insert({
        student_id: studentId,
        date: tomorrow,
        meal_type: mealType,
        status: 'booked',
        qr_code: qrCode,
      })
      .select('id, date, meal_type, status, qr_code, booked_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: `You've already booked ${MEAL_INFO[mealType].label.toLowerCase()} for tomorrow` });
      }
      throw error;
    }

    res.status(201).json({
      id: created.id,
      date: created.date,
      mealType: created.meal_type,
      status: created.status,
      qrCode: created.qr_code,
      bookedAt: created.booked_at,
      label: MEAL_INFO[created.meal_type].label,
      timeLabel: MEAL_INFO[created.meal_type].timeLabel,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
