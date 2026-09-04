import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

const PRIORITIES = ['normal', 'important', 'urgent'];

// GET /api/admin/notices
router.get('/', async (req, res, next) => {
  try {
    const { data: rows, error } = await supabase
      .from('notices')
      .select('id, title, description, category, priority, published, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      published: r.published === 1,
      createdAt: r.created_at,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/notices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data: row, error } = await supabase
      .from('notices')
      .select('id, title, description, category, priority, published, created_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!row) return res.status(404).json({ error: 'Notice not found' });

    res.status(200).json({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      published: row.published === 1,
      createdAt: row.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/notices
router.post('/', async (req, res, next) => {
  try {
    const { title, description, category, priority, published } = req.body || {};
    const errors = {};

    if (!title || !title.trim()) errors.title = 'Title is required';
    if (!description || !description.trim()) errors.description = 'Description is required';
    if (priority !== undefined && priority !== null && priority !== '' && !PRIORITIES.includes(priority)) {
      errors.priority = 'Select a valid priority';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const { data: created, error } = await supabase
      .from('notices')
      .insert({
        title: title.trim(),
        description: description.trim(),
        category: category && category.trim() ? category.trim() : 'general',
        priority: priority || 'normal',
        published: published === false ? 0 : 1,
        created_by: req.user.id,
      })
      .select('id, title, description, category, priority, published, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      id: created.id,
      title: created.title,
      description: created.description,
      category: created.category,
      priority: created.priority,
      published: created.published === 1,
      createdAt: created.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/notices/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { data: notice, error: nErr } = await supabase
      .from('notices')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (nErr) throw nErr;
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    const { title, description, category, priority, published } = req.body || {};
    const errors = {};

    if (title !== undefined && (!title || !title.trim())) errors.title = 'Title is required';
    if (description !== undefined && (!description || !description.trim())) errors.description = 'Description is required';
    if (priority !== undefined && priority !== null && priority !== '' && !PRIORITIES.includes(priority)) {
      errors.priority = 'Select a valid priority';
    }
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (category !== undefined) updates.category = category && category.trim() ? category.trim() : 'general';
    if (priority !== undefined) updates.priority = priority || 'normal';
    if (published !== undefined) updates.published = published ? 1 : 0;

    if (Object.keys(updates).length > 0) {
      const { error: updErr } = await supabase
        .from('notices')
        .update(updates)
        .eq('id', notice.id);
      if (updErr) throw updErr;
    }

    const { data: updated, error: fetchErr } = await supabase
      .from('notices')
      .select('id, title, description, category, priority, published, created_at')
      .eq('id', notice.id)
      .single();

    if (fetchErr) throw fetchErr;

    res.status(200).json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      category: updated.category,
      priority: updated.priority,
      published: updated.published === 1,
      createdAt: updated.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/notices/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { data: notice, error: nErr } = await supabase
      .from('notices')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (nErr) throw nErr;
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    const { error: delErr } = await supabase
      .from('notices')
      .delete()
      .eq('id', notice.id);

    if (delErr) throw delErr;
    res.status(200).json({ id: notice.id, deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
