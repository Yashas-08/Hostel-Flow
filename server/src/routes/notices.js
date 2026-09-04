import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { data: rows, error } = await supabase
      .from('notices')
      .select('id, title, description, category, priority, created_at')
      .eq('published', 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formatted = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      priority: r.priority,
      createdAt: r.created_at,
    }));

    res.status(200).json(formatted);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data: notice, error } = await supabase
      .from('notices')
      .select('id, title, description, category, priority, created_at')
      .eq('id', req.params.id)
      .eq('published', 1)
      .maybeSingle();

    if (error) throw error;
    if (!notice) return res.status(404).json({ error: 'Notice not found' });

    res.status(200).json({
      id: notice.id,
      title: notice.title,
      description: notice.description,
      category: notice.category,
      priority: notice.priority,
      createdAt: notice.created_at,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
