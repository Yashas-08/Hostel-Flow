import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const STATUSES = ['submitted', 'in_progress', 'resolved', 'rejected'];

// GET /api/admin/complaints?status=&category=&q=
router.get('/', async (req, res, next) => {
  try {
    const { status, category, q } = req.query;

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }

    let query = supabase
      .from('complaints')
      .select(`
        id, category, title, status, priority, created_at, updated_at,
        student:students!inner(
          id, student_code,
          user:users!inner(full_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category && String(category).trim()) query = query.eq('category', String(category).trim());

    const { data: rows, error } = await query;
    if (error) throw error;

    let list = (rows || []).map((c) => ({
      id: c.id,
      category: c.category,
      title: c.title,
      status: c.status,
      priority: c.priority,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      studentId: c.student.id,
      studentCode: c.student.student_code,
      studentName: c.student.user.full_name,
    }));

    if (q && String(q).trim()) {
      const filter = String(q).trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(filter) ||
          item.studentName.toLowerCase().includes(filter) ||
          item.studentCode.toLowerCase().includes(filter)
      );
    }

    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/complaints/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data: c, error } = await supabase
      .from('complaints')
      .select(`
        id, category, title, description, image_url, location, priority,
        status, resolution_notes, created_at, updated_at,
        student:students!inner(
          id, student_code,
          user:users!inner(full_name)
        )
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!c) return res.status(404).json({ error: 'Complaint not found' });

    res.status(200).json({
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
      studentId: c.student.id,
      studentCode: c.student.student_code,
      studentName: c.student.user.full_name,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/complaints/:id  { status?, resolutionNotes? }
router.patch('/:id', async (req, res, next) => {
  try {
    const { data: complaint, error: cErr } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (cErr) throw cErr;
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    const { status, resolutionNotes } = req.body || {};
    const errors = {};

    if (status !== undefined && !STATUSES.includes(status)) {
      errors.status = 'Select a valid status';
    }
    if (resolutionNotes !== undefined && resolutionNotes !== null && typeof resolutionNotes !== 'string') {
      errors.resolutionNotes = 'Resolution notes must be text';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (resolutionNotes !== undefined) updates.resolution_notes = resolutionNotes ? resolutionNotes.trim() : null;

    const { error: updErr } = await supabase
      .from('complaints')
      .update(updates)
      .eq('id', complaint.id);

    if (updErr) throw updErr;

    const { data: updated, error: fetchErr } = await supabase
      .from('complaints')
      .select('id, category, title, description, image_url, location, priority, status, resolution_notes, created_at, updated_at')
      .eq('id', complaint.id)
      .single();

    if (fetchErr) throw fetchErr;

    res.status(200).json({
      id: updated.id,
      category: updated.category,
      title: updated.title,
      description: updated.description,
      imageUrl: updated.image_url,
      location: updated.location,
      priority: updated.priority,
      status: updated.status,
      resolutionNotes: updated.resolution_notes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
