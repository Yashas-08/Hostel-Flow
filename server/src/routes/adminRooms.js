import { Router } from 'express';
import { supabase } from '../db/index.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  occupancyStatus,
  allocateStudentToRoom,
  deallocateStudentFromRoom,
  updateRoomDetails,
} from '../lib/roomAllocation.js';

const router = Router();
router.use(authenticate, requireRole('admin'));

// GET /api/admin/rooms/blocks
router.get('/blocks', async (req, res, next) => {
  try {
    const { data: rows, error } = await supabase
      .from('blocks')
      .select('id, name, hostel_name')
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json((rows || []).map((b) => ({ id: b.id, name: b.name, hostelName: b.hostel_name })));
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rooms?blockId=&floor=&status=
router.get('/', async (req, res, next) => {
  try {
    const { blockId, floor, status } = req.query;

    let query = supabase
      .from('rooms')
      .select(`
        id, floor, room_number, capacity,
        block:blocks!inner(id, name),
        beds(id, is_occupied)
      `)
      .order('floor', { ascending: true })
      .order('room_number', { ascending: true });

    if (blockId) {
      query = query.eq('block_id', Number(blockId));
    }
    if (floor) {
      query = query.eq('floor', Number(floor));
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const withStatus = (rows || []).map((r) => {
      const occupied = (r.beds || []).filter((b) => b.is_occupied === 1).length;
      return {
        id: r.id,
        floor: r.floor,
        roomNumber: r.room_number,
        capacity: r.capacity,
        block: r.block?.name || '',
        blockId: r.block?.id || 0,
        occupied,
        status: occupancyStatus(occupied, r.capacity),
      };
    });

    const filtered = status ? withStatus.filter((r) => r.status === status) : withStatus;
    res.status(200).json(filtered);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/rooms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .select(`
        id, floor, room_number, capacity,
        block:blocks!inner(id, name, hostel_name)
      `)
      .eq('id', req.params.id)
      .maybeSingle();

    if (roomErr) throw roomErr;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const { data: occupantRows, error: occErr } = await supabase
      .from('students')
      .select(`
        id, student_code,
        user:users!inner(full_name),
        bed:beds!inner(id, room_id)
      `)
      .eq('bed.room_id', room.id);

    if (occErr) throw occErr;

    const occupants = (occupantRows || []).map((o) => ({
      id: o.id,
      studentCode: o.student_code,
      fullName: o.user.full_name,
    }));

    res.status(200).json({
      id: room.id,
      floor: room.floor,
      roomNumber: room.room_number,
      capacity: room.capacity,
      block: room.block.name,
      hostel: room.block.hostel_name,
      occupied: occupants.length,
      status: occupancyStatus(occupants.length, room.capacity),
      occupants,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/rooms/:id — Atomic update floor/room number/capacity
router.patch('/:id', async (req, res, next) => {
  try {
    const { floor, roomNumber, capacity } = req.body || {};
    const errors = {};

    if (floor !== undefined && (typeof floor !== 'number' || floor < 0)) {
      errors.floor = 'Floor must be a valid number';
    }
    if (roomNumber !== undefined && (!roomNumber || !String(roomNumber).trim())) {
      errors.roomNumber = 'Room number is required';
    }
    if (capacity !== undefined && (typeof capacity !== 'number' || capacity < 1)) {
      errors.capacity = 'Capacity must be at least 1';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', fields: errors });
    }

    const updated = await updateRoomDetails(req.params.id, floor, roomNumber, capacity);
    res.status(200).json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not update room' });
  }
});

// POST /api/admin/rooms/:id/allocate  { studentId }
router.post('/:id/allocate', async (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    const result = await allocateStudentToRoom(req.params.id, studentId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not allocate this student' });
  }
});

// POST /api/admin/rooms/:id/deallocate  { studentId }
router.post('/:id/deallocate', async (req, res) => {
  const { studentId } = req.body || {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  try {
    const result = await deallocateStudentFromRoom(req.params.id, studentId);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Could not deallocate this student' });
  }
});

export default router;
