import { supabase } from '../db/index.js';

export function occupancyStatus(occupied, capacity) {
  if (occupied === 0) return 'available';
  if (occupied >= capacity) return 'full';
  return 'partial';
}

export async function allocateStudentToRoom(roomId, studentId) {
  const { data, error } = await supabase.rpc('allocate_student_to_room', {
    p_room_id: Number(roomId),
    p_student_id: Number(studentId),
  });

  if (error) {
    const err = new Error(error.message);
    if (error.code === 'P0004' || error.code === 'P0005') err.status = 404;
    else if (error.code === 'P0006' || error.code === 'P0007') err.status = 400;
    else err.status = 400;
    throw err;
  }

  return data;
}

export async function deallocateStudentFromRoom(roomId, studentId) {
  const { data, error } = await supabase.rpc('deallocate_student_from_room', {
    p_room_id: Number(roomId),
    p_student_id: Number(studentId),
  });

  if (error) {
    const err = new Error(error.message);
    if (error.code === 'P0004' || error.code === 'P0008' || error.code === 'P0009') err.status = 404;
    else err.status = 400;
    throw err;
  }

  return data;
}

export async function updateRoomDetails(roomId, floor, roomNumber, capacity) {
  const { data, error } = await supabase.rpc('update_room_details', {
    p_room_id: Number(roomId),
    p_floor: floor !== undefined ? Number(floor) : null,
    p_room_number: roomNumber !== undefined ? String(roomNumber).trim() : null,
    p_capacity: capacity !== undefined ? Number(capacity) : null,
  });

  if (error) {
    const err = new Error(error.message);
    if (error.code === 'P0004') err.status = 404;
    else if (error.code === 'P0010') err.status = 400;
    else err.status = 400;
    throw err;
  }

  return data;
}
