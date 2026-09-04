import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const MAX_AVATAR_DATA_URI_LENGTH = 1_800_000;

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const { count: totalStudents } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true });

    const { count: totalRooms } = await supabase
      .from('rooms')
      .select('id', { count: 'exact', head: true });

    const { data: occupiedBeds } = await supabase
      .from('beds')
      .select('room_id')
      .eq('is_occupied', 1);

    const occupiedRoomIds = new Set((occupiedBeds || []).map((b) => b.room_id));
    const occupiedRooms = occupiedRoomIds.size;

    const { count: pendingLeaves } = await supabase
      .from('leaves')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const { count: pendingComplaints } = await supabase
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .in('status', ['submitted', 'in_progress']);

    const todayStr = new Date().toISOString().split('T')[0];
    const { count: presentToday } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('date', todayStr)
      .eq('status', 'present');

    // Recent activity: fetch most recent events across leaves/complaints/attendance/notices
    const { data: recentLeaves } = await supabase
      .from('leaves')
      .select(`
        id, applied_at, leave_type, status,
        student:students!inner(
          user:users!inner(full_name)
        )
      `)
      .order('applied_at', { ascending: false })
      .limit(8);

    const { data: recentComplaints } = await supabase
      .from('complaints')
      .select(`
        id, created_at, title, status,
        student:students!inner(
          user:users!inner(full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(8);

    const { data: recentAttendance } = await supabase
      .from('attendance')
      .select(`
        id, checked_in_at, status,
        student:students!inner(
          user:users!inner(full_name)
        )
      `)
      .not('checked_in_at', 'is', null)
      .order('checked_in_at', { ascending: false })
      .limit(8);

    const { data: recentNotices } = await supabase
      .from('notices')
      .select('id, created_at, title, published')
      .order('created_at', { ascending: false })
      .limit(8);

    const events = [];

    (recentLeaves || []).forEach((l) => {
      events.push({
        type: 'leave',
        id: l.id,
        occurredAt: l.applied_at,
        studentName: l.student?.user?.full_name || '',
        detail: l.leave_type,
        status: l.status,
      });
    });

    (recentComplaints || []).forEach((c) => {
      events.push({
        type: 'complaint',
        id: c.id,
        occurredAt: c.created_at,
        studentName: c.student?.user?.full_name || '',
        detail: c.title,
        status: c.status,
      });
    });

    (recentAttendance || []).forEach((a) => {
      events.push({
        type: 'attendance',
        id: a.id,
        occurredAt: a.checked_in_at,
        studentName: a.student?.user?.full_name || '',
        detail: 'Checked in',
        status: a.status,
      });
    });

    (recentNotices || []).forEach((n) => {
      events.push({
        type: 'notice',
        id: n.id,
        occurredAt: n.created_at,
        studentName: null,
        detail: n.title,
        status: n.published === 1 ? 'published' : 'draft',
      });
    });

    // Sort combined feed by occurredAt DESC and take top 8
    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    const top8Activity = events.slice(0, 8);

    res.status(200).json({
      totalStudents: totalStudents || 0,
      rooms: { occupied: occupiedRooms, total: totalRooms || 0 },
      pendingLeaves: pendingLeaves || 0,
      pendingComplaints: pendingComplaints || 0,
      attendanceToday: { present: presentToday || 0, totalStudents: totalStudents || 0 },
      recentActivity: top8Activity,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/me
router.patch('/me', async (req, res, next) => {
  try {
    const { fullName, phone, avatarUrl } = req.body || {};
    const errors = {};

    if (fullName !== undefined && (!fullName || !fullName.trim())) {
      errors.fullName = 'Full name is required';
    }
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
    if (fullName !== undefined) updates.full_name = fullName.trim();
    if (phone !== undefined) updates.phone = phone && phone.trim() ? phone.trim() : null;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl || null;

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
    if (!user) return res.status(404).json({ error: 'Admin profile not found' });

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