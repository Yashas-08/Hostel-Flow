import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
}

const BLOCK_BY_GENDER = { male: 'R Block', female: 'M Block' };

function generateTempPassword() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

// GET /api/admin/students?q=&course=&year=
router.get('/', async (req, res, next) => {
  try {
    const { q, course, year } = req.query;

    let query = supabase
      .from('students')
      .select(`
        id, student_code, course, year,
        user:users!inner(full_name, email, gender),
        bed:beds(
          bed_number,
          room:rooms(
            room_number,
            block:blocks(name)
          )
        )
      `)
      .order('user(full_name)', { ascending: true });

    if (course && String(course).trim()) {
      query = query.eq('course', String(course).trim());
    }
    if (year && String(year).trim()) {
      query = query.eq('year', Number(year));
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    let list = (rows || []).map((r) => {
      const roomNumber = r.bed?.room?.room_number || null;
      const blockName = r.bed?.room?.block?.name || null;
      return {
        id: r.id,
        studentCode: r.student_code,
        fullName: r.user?.full_name || '',
        email: r.user?.email || '',
        gender: r.user?.gender || null,
        course: r.course,
        year: r.year,
        room: roomNumber ? { roomNumber, block: blockName } : null,
        status: 'active',
      };
    });

    if (q && String(q).trim()) {
      const filter = String(q).trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(filter) ||
          s.email.toLowerCase().includes(filter) ||
          s.studentCode.toLowerCase().includes(filter)
      );
    }

    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/students/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data: student, error: stErr } = await supabase
      .from('students')
      .select(`
        *,
        user:users!inner(full_name, email, phone, gender, date_of_birth)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (stErr) throw stErr;
    if (!student) return res.status(404).json({ error: 'Student not found' });

    let room = null;
    if (student.bed_id) {
      const { data: bed } = await supabase
        .from('beds')
        .select(`
          bed_number,
          room:rooms(
            id, room_number, floor, capacity,
            block:blocks(id, name, hostel_name)
          )
        `)
        .eq('id', student.bed_id)
        .maybeSingle();

      if (bed?.room) {
        room = {
          roomId: bed.room.id,
          roomNumber: bed.room.room_number,
          floor: bed.room.floor,
          block: bed.room.block?.name || '',
          hostel: bed.room.block?.hostel_name || 'Hostel Flow Residency',
        };
      }
    }

    const { data: guardian } = await supabase
      .from('guardian_details')
      .select('father_name, father_phone, mother_name, mother_phone, relationship')
      .eq('student_id', student.id)
      .maybeSingle();

    const formattedGuardian = guardian
      ? {
          fatherName: guardian.father_name,
          fatherPhone: guardian.father_phone,
          motherName: guardian.mother_name,
          motherPhone: guardian.mother_phone,
          relationship: guardian.relationship,
        }
      : null;

    const { data: rawLeaves } = await supabase
      .from('leaves')
      .select('id, leave_type, start_date, end_date, reason, status, rejection_reason, applied_at')
      .eq('student_id', student.id)
      .order('applied_at', { ascending: false });

    const leaves = (rawLeaves || []).map((l) => ({
      id: l.id,
      leaveType: l.leave_type,
      startDate: l.start_date,
      endDate: l.end_date,
      reason: l.reason,
      status: l.status,
      rejectionReason: l.rejection_reason,
      appliedAt: l.applied_at,
      days: daysBetween(l.start_date, l.end_date),
    }));

    const { data: rawComplaints } = await supabase
      .from('complaints')
      .select('id, category, title, description, image_url, location, priority, status, resolution_notes, created_at, updated_at')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    const complaints = (rawComplaints || []).map((c) => ({
      id: c.id,
      category: c.category,
      title: c.title,
      description: c.description,
      imageUrl: c.image_url,
      location: c.location,
      priority: c.priority,
      status: c.status,
      resolutionNotes: c.resolution_notes,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    const { data: rawAttendance } = await supabase
      .from('attendance')
      .select('date, status, checked_in_at')
      .eq('student_id', student.id)
      .order('date', { ascending: false })
      .limit(15);

    const attendanceList = (rawAttendance || []).map((a) => ({
      date: a.date,
      status: a.status,
      checkedInAt: a.checked_in_at,
    }));

    const { count: presentDaysTotal } = await supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('status', 'present');

    res.status(200).json({
      id: student.id,
      studentCode: student.student_code,
      fullName: student.user.full_name,
      email: student.user.email,
      phone: student.user.phone,
      gender: student.user.gender,
      dateOfBirth: student.user.date_of_birth,
      course: student.course,
      department: student.department,
      year: student.year,
      room,
      guardian: formattedGuardian,
      leaves,
      complaints,
      attendance: {
        recent: attendanceList,
        presentDaysTotal: presentDaysTotal || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/students/admit — Atomic RPC transaction
router.post('/admit', async (req, res, next) => {
  try {
    const body = req.body || {};
    const {
      fullName, dateOfBirth, gender, phone, email, avatarUrl,
      studentCode, course, department, year,
      block, roomNumber,
      guardian,
    } = body;
    const g = guardian || {};

    const errors = {};

    if (!fullName || !fullName.trim()) errors.fullName = 'Full name is required';
    if (!dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!gender || !['male', 'female'].includes(gender)) errors.gender = 'Select male or female';
    if (!phone || !String(phone).trim() || String(phone).trim().length < 7 || String(phone).trim().length > 20) {
      errors.phone = 'Enter a valid phone number';
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (avatarUrl && (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('data:image/'))) {
      errors.avatarUrl = 'Photo must be a valid image file';
    } else if (avatarUrl && avatarUrl.length > 1800000) {
      errors.avatarUrl = 'Photo is too large. Please use an image under 1.3MB.';
    }

    if (!studentCode || !String(studentCode).trim()) errors.studentCode = 'Student ID / admission number is required';
    if (!course || !String(course).trim()) errors.course = 'Course is required';
    if (!department || !String(department).trim()) errors.department = 'Department is required';
    if (!year || typeof year !== 'number' || year < 1) errors.year = 'Select a valid year';

    if (!block || !['R Block', 'M Block'].includes(block)) {
      errors.block = 'Select a block';
    } else if (gender && BLOCK_BY_GENDER[gender] && block !== BLOCK_BY_GENDER[gender]) {
      errors.block = gender === 'male'
        ? 'Male students can only be assigned to R Block'
        : 'Female students can only be assigned to M Block';
    }
    if (!roomNumber || !String(roomNumber).trim()) errors.roomNumber = 'Room number is required';

    if (!g.fatherName || !String(g.fatherName).trim()) errors.fatherName = "Father's / guardian's name is required";
    if (!g.fatherPhone || String(g.fatherPhone).trim().length < 7 || String(g.fatherPhone).trim().length > 20) {
      errors.fatherPhone = 'Enter a valid phone number';
    }
    if (!g.motherName || !String(g.motherName).trim()) errors.motherName = "Mother's / guardian's name is required";
    if (!g.motherPhone || String(g.motherPhone).trim().length < 7 || String(g.motherPhone).trim().length > 20) {
      errors.motherPhone = 'Enter a valid phone number';
    }
    if (!g.relationship || !String(g.relationship).trim()) errors.relationship = 'Relationship with student is required';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const trimmedCode = String(studentCode).trim();

    // Check unique email and student code
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: 'Validation failed', fields: { email: 'This email is already in use' } });
    }

    const { data: existingCode } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', trimmedCode)
      .maybeSingle();

    if (existingCode) {
      return res.status(400).json({ error: 'Validation failed', fields: { studentCode: 'This student ID is already in use' } });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = bcrypt.hashSync(tempPassword, 10);

    // Call atomic PostgreSQL RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc('admit_student', {
      p_full_name: fullName.trim(),
      p_email: normalizedEmail,
      p_password_hash: passwordHash,
      p_phone: String(phone).trim(),
      p_avatar_url: avatarUrl || null,
      p_date_of_birth: dateOfBirth,
      p_gender: gender,
      p_student_code: trimmedCode,
      p_course: course.trim(),
      p_department: department.trim(),
      p_year: year,
      p_block_name: block,
      p_room_number: String(roomNumber).trim(),
      p_father_name: g.fatherName.trim(),
      p_father_phone: String(g.fatherPhone).trim(),
      p_mother_name: g.motherName.trim(),
      p_mother_phone: String(g.motherPhone).trim(),
      p_relationship: g.relationship.trim(),
    });

    if (rpcError) {
      return res.status(400).json({ error: rpcError.message || 'Could not complete admission' });
    }

    res.status(201).json({
      id: rpcResult.studentId,
      fullName: fullName.trim(),
      studentCode: trimmedCode,
      email: normalizedEmail,
      tempPassword,
      block,
      roomNumber: rpcResult.roomNumber,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
