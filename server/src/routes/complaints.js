import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('student'));

const CATEGORIES = ['Electrical', 'Plumbing', 'Furniture', 'Cleanliness', 'Internet/Wi-Fi', 'Security', 'Other'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const MAX_IMAGE_DATA_URI_LENGTH = 2_800_000;

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

router.get('/', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: rows, error } = await supabase
      .from('complaints')
      .select('id, category, title, description, image_url, location, priority, status, resolution_notes, created_at, updated_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (rows || []).map((c) => ({
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

    res.status(200).json(formatted);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { data: row, error } = await supabase
      .from('complaints')
      .select('id, category, title, description, image_url, location, priority, status, resolution_notes, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw error;
    if (!row) return res.status(404).json({ error: 'Complaint not found' });

    res.status(200).json({
      id: row.id,
      category: row.category,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      location: row.location,
      priority: row.priority,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const studentId = await getStudentIdOrThrow(req.user.id, res);
    if (!studentId) return;

    const { category, title, description, imageUrl, location, priority } = req.body || {};
    const errors = {};

    if (!category || !category.trim()) errors.category = 'Category is required';
    else if (!CATEGORIES.includes(category)) errors.category = 'Select a valid category';

    if (!title || !title.trim()) errors.title = 'Title is required';
    else if (title.trim().length > 120) errors.title = 'Title must be under 120 characters';

    if (!description || !description.trim()) errors.description = 'Description is required';

    if (priority !== undefined && priority !== null && priority !== '' && !PRIORITIES.includes(priority)) {
      errors.priority = 'Select a valid priority';
    }

    if (imageUrl) {
      if (typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
        errors.image = 'Image must be a valid image file';
      } else if (imageUrl.length > MAX_IMAGE_DATA_URI_LENGTH) {
        errors.image = 'Image is too large. Please use an image under 2MB.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const { data: created, error } = await supabase
      .from('complaints')
      .insert({
        student_id: studentId,
        category,
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl || null,
        location: location && location.trim() ? location.trim() : null,
        priority: priority || 'normal',
        status: 'submitted',
      })
      .select('id, category, title, description, image_url, location, priority, status, resolution_notes, created_at, updated_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: created.id,
      category: created.category,
      title: created.title,
      description: created.description,
      imageUrl: created.image_url,
      location: created.location,
      priority: created.priority,
      status: created.status,
      resolutionNotes: created.resolution_notes,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
