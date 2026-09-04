import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('student'));

async function getStudentByUserId(userId) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

router.get('/me', async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('full_name, email, phone, avatar_url')
      .eq('id', req.user.id)
      .maybeSingle();

    if (userErr) throw userErr;

    res.status(200).json({
      id: student.id,
      studentCode: student.student_code,
      course: student.course,
      year: student.year,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me/room', async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });
    if (!student.bed_id) return res.status(404).json({ error: 'No room currently allocated' });

    const { data: bed, error: bedErr } = await supabase
      .from('beds')
      .select('*')
      .eq('id', student.bed_id)
      .maybeSingle();
    if (bedErr) throw bedErr;

    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', bed.room_id)
      .maybeSingle();
    if (roomErr) throw roomErr;

    const { data: block, error: blockErr } = await supabase
      .from('blocks')
      .select('*')
      .eq('id', room.block_id)
      .maybeSingle();
    if (blockErr) throw blockErr;

    // Roommates query: other students in the same room
    const { data: roommateRows, error: rmErr } = await supabase
      .from('students')
      .select(`
        id,
        user:users!inner(full_name),
        bed:beds!inner(bed_number, room_id)
      `)
      .eq('bed.room_id', room.id)
      .neq('id', student.id);

    if (rmErr) throw rmErr;

    const roommates = (roommateRows || []).map(r => ({
      fullName: r.user.full_name,
      bedNumber: r.bed.bed_number,
    }));

    res.status(200).json({
      roomNumber: room.room_number,
      floor: room.floor,
      block: block.name,
      hostel: block.hostel_name,
      bedNumber: bed.bed_number,
      roommates,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me/dashboard', async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const todayStr = new Date().toISOString().split('T')[0];

    const { data: today, error: attErr } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', todayStr)
      .maybeSingle();
    if (attErr) throw attErr;

    const { data: pendingLeaves, error: plErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('student_id', student.id)
      .eq('status', 'pending')
      .order('applied_at', { ascending: false })
      .limit(1);
    if (plErr) throw plErr;
    const pendingLeave = pendingLeaves && pendingLeaves.length > 0 ? pendingLeaves[0] : null;

    const { data: upcomingLeaves, error: ulErr } = await supabase
      .from('leaves')
      .select('*')
      .eq('student_id', student.id)
      .eq('status', 'approved')
      .gte('start_date', todayStr)
      .order('start_date', { ascending: true })
      .limit(1);
    if (ulErr) throw ulErr;
    const upcomingApproved = upcomingLeaves && upcomingLeaves.length > 0 ? upcomingLeaves[0] : null;

    res.status(200).json({
      attendanceStatus: today ? today.status : 'not_checked_in',
      pendingLeave: pendingLeave ? {
        id: pendingLeave.id,
        leaveType: pendingLeave.leave_type,
        startDate: pendingLeave.start_date,
        endDate: pendingLeave.end_date,
      } : null,
      upcomingLeave: upcomingApproved ? {
        id: upcomingApproved.id,
        leaveType: upcomingApproved.leave_type,
        startDate: upcomingApproved.start_date,
        endDate: upcomingApproved.end_date,
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

const MAX_AVATAR_DATA_URI_LENGTH = 1_800_000;

router.patch('/me', async (req, res, next) => {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { phone, avatarUrl } = req.body || {};
    const errors = {};

    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string' || phone.trim().length < 7 || phone.trim().length > 20) {
        errors.phone = 'Enter a valid phone number';
      }
    }

    if (avatarUrl !== undefined && avatarUrl !== null && avatarUrl !== '') {
      if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/')) {
        errors.avatarUrl = 'Photo must be a valid image file';
      } else if (avatarUrl.length > MAX_AVATAR_DATA_URI_LENGTH) {
        errors.avatarUrl = 'Photo is too large. Please use an image under 1.3MB.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const updates = {};
    if (phone !== undefined) {
      updates.phone = phone && phone.trim() ? phone.trim() : null;
    }
    if (avatarUrl !== undefined) {
      updates.avatar_url = avatarUrl || null;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id);
      if (updErr) throw updErr;
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('full_name, email, phone, avatar_url')
      .eq('id', req.user.id)
      .maybeSingle();
    if (userErr) throw userErr;

    res.status(200).json({
      id: student.id,
      studentCode: student.student_code,
      course: student.course,
      year: student.year,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me/notifications', async (req, res, next) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('notify_leave_updates, notify_complaint_updates, notify_notices')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'Student profile not found' });

    res.status(200).json({
      leaveUpdates: !!user.notify_leave_updates,
      complaintUpdates: !!user.notify_complaint_updates,
      notices: !!user.notify_notices,
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/me/notifications', async (req, res, next) => {
  try {
    const { leaveUpdates, complaintUpdates, notices } = req.body || {};
    const fields = { leaveUpdates, complaintUpdates, notices };
    const errors = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && typeof value !== 'boolean') {
        errors[key] = 'Must be true or false';
      }
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const updates = {};
    if (leaveUpdates !== undefined) updates.notify_leave_updates = leaveUpdates ? 1 : 0;
    if (complaintUpdates !== undefined) updates.notify_complaint_updates = complaintUpdates ? 1 : 0;
    if (notices !== undefined) updates.notify_notices = notices ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('users')
        .update(updates)
        .eq('id', req.user.id);
      if (updErr) throw updErr;
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('notify_leave_updates, notify_complaint_updates, notify_notices')
      .eq('id', req.user.id)
      .maybeSingle();
    if (userErr) throw userErr;

    res.status(200).json({
      leaveUpdates: !!user.notify_leave_updates,
      complaintUpdates: !!user.notify_complaint_updates,
      notices: !!user.notify_notices,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
