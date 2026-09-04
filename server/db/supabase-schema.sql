-- ============================================================================
-- HOSTEL FLOW - SUPABASE POSTGRESQL SCHEMA
-- Dedicated Schema for Hostel Flow Project
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  date_of_birth TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  notify_leave_updates INTEGER NOT NULL DEFAULT 1,
  notify_complaint_updates INTEGER NOT NULL DEFAULT 1,
  notify_notices INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. BLOCKS TABLE (R Block = Boys, M Block = Girls)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocks (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  hostel_name TEXT NOT NULL DEFAULT 'Hostel Flow Residency'
);

-- ----------------------------------------------------------------------------
-- 3. ROOMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id BIGSERIAL PRIMARY KEY,
  block_id BIGINT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  floor INTEGER NOT NULL,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  UNIQUE(block_id, room_number)
);

-- ----------------------------------------------------------------------------
-- 4. BEDS TABLE (Internal mechanism, never exposed directly in UI)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS beds (
  id BIGSERIAL PRIMARY KEY,
  room_id BIGINT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  is_occupied INTEGER NOT NULL DEFAULT 0,
  UNIQUE(room_id, bed_number)
);

-- ----------------------------------------------------------------------------
-- 5. STUDENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_code TEXT UNIQUE NOT NULL,
  course TEXT,
  department TEXT,
  year INTEGER,
  bed_id BIGINT REFERENCES beds(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 6. GUARDIAN DETAILS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS guardian_details (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  father_name TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  relationship TEXT
);

-- ----------------------------------------------------------------------------
-- 7. LEAVES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leaves (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  qr_code TEXT UNIQUE,
  checked_out_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 8. COMPLAINTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'resolved', 'rejected')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. NOTICES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notices (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  published INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 10. ATTENDANCE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'on_leave')),
  checked_in_at TIMESTAMPTZ,
  qr_ref TEXT,
  UNIQUE(student_id, date)
);

-- ----------------------------------------------------------------------------
-- 11. QR CHECKPOINTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qr_checkpoints (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- ----------------------------------------------------------------------------
-- 12. MEAL BOOKINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_bookings (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'consumed', 'cancelled')),
  qr_code TEXT UNIQUE NOT NULL,
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  UNIQUE(student_id, date, meal_type)
);

-- ----------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code);
CREATE INDEX IF NOT EXISTS idx_beds_room_id ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_rooms_block_id ON rooms(block_id);
CREATE INDEX IF NOT EXISTS idx_leaves_student_id ON leaves(student_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_notices_published ON notices(published);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_student_date ON meal_bookings(student_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_bookings_qr_code ON meal_bookings(qr_code);
CREATE INDEX IF NOT EXISTS idx_leaves_qr_code ON leaves(qr_code);

-- ============================================================================
-- ATOMIC TRANSACTION RPC FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper function: sync_beds_to_capacity
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_beds_to_capacity(p_room_id BIGINT, p_capacity INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_current_count INT;
  v_i INT;
  v_removable_bed_id BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_current_count FROM beds WHERE room_id = p_room_id;
  
  IF v_current_count < p_capacity THEN
    FOR v_i IN (v_current_count + 1)..p_capacity LOOP
      INSERT INTO beds (room_id, bed_number, is_occupied)
      VALUES (p_room_id, v_i::TEXT, 0);
    END LOOP;
  ELSIF v_current_count > p_capacity THEN
    FOR v_removable_bed_id IN
      SELECT id FROM beds
      WHERE room_id = p_room_id AND is_occupied = 0
      ORDER BY id DESC
      LIMIT (v_current_count - p_capacity)
    LOOP
      DELETE FROM beds WHERE id = v_removable_bed_id;
    END LOOP;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. admit_student
-- Atomic multi-table student admission: user, student, room, bed, guardian
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admit_student(
  p_full_name TEXT,
  p_email TEXT,
  p_password_hash TEXT,
  p_phone TEXT,
  p_avatar_url TEXT,
  p_date_of_birth TEXT,
  p_gender TEXT,
  p_student_code TEXT,
  p_course TEXT,
  p_department TEXT,
  p_year INT,
  p_block_name TEXT,
  p_room_number TEXT,
  p_father_name TEXT,
  p_father_phone TEXT,
  p_mother_name TEXT,
  p_mother_phone TEXT,
  p_relationship TEXT
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_user_id BIGINT;
  v_student_id BIGINT;
  v_block_id BIGINT;
  v_room_id BIGINT;
  v_room_capacity INT;
  v_bed_id BIGINT;
  v_occupied_count INT;
BEGIN
  -- Validate gender block restriction
  IF p_gender = 'male' AND p_block_name != 'R Block' THEN
    RAISE EXCEPTION 'Male students can only be assigned to R Block' USING ERRCODE = 'P0001';
  ELSIF p_gender = 'female' AND p_block_name != 'M Block' THEN
    RAISE EXCEPTION 'Female students can only be assigned to M Block' USING ERRCODE = 'P0001';
  END IF;

  -- Validate unique email & student code
  IF EXISTS (SELECT 1 FROM users WHERE LOWER(email) = LOWER(TRIM(p_email))) THEN
    RAISE EXCEPTION 'This email is already in use' USING ERRCODE = '23505';
  END IF;

  IF EXISTS (SELECT 1 FROM students WHERE student_code = TRIM(p_student_code)) THEN
    RAISE EXCEPTION 'This student ID is already in use' USING ERRCODE = '23505';
  END IF;

  -- Find block
  SELECT id INTO v_block_id FROM blocks WHERE name = p_block_name;
  IF v_block_id IS NULL THEN
    RAISE EXCEPTION 'Hostel block configuration is missing' USING ERRCODE = 'P0002';
  END IF;

  -- Insert user
  INSERT INTO users (email, password_hash, role, full_name, phone, avatar_url, date_of_birth, gender)
  VALUES (LOWER(TRIM(p_email)), p_password_hash, 'student', TRIM(p_full_name), TRIM(p_phone), p_avatar_url, p_date_of_birth, p_gender)
  RETURNING id INTO v_user_id;

  -- Insert student
  INSERT INTO students (user_id, student_code, course, department, year)
  VALUES (v_user_id, TRIM(p_student_code), TRIM(p_course), TRIM(p_department), p_year)
  RETURNING id INTO v_student_id;

  -- Find or create room
  SELECT id, capacity INTO v_room_id, v_room_capacity FROM rooms
  WHERE block_id = v_block_id AND room_number = TRIM(p_room_number);

  IF v_room_id IS NULL THEN
    INSERT INTO rooms (block_id, floor, room_number, capacity)
    VALUES (v_block_id, 0, TRIM(p_room_number), 1)
    RETURNING id, capacity INTO v_room_id, v_room_capacity;
  END IF;

  -- Synchronize beds for room
  PERFORM sync_beds_to_capacity(v_room_id, v_room_capacity);

  -- Find available bed
  SELECT id INTO v_bed_id FROM beds
  WHERE room_id = v_room_id AND is_occupied = 0
  ORDER BY id ASC
  LIMIT 1
  FOR UPDATE;

  IF v_bed_id IS NULL THEN
    RAISE EXCEPTION 'This room is full' USING ERRCODE = 'P0003';
  END IF;

  -- Assign bed
  UPDATE beds SET is_occupied = 1 WHERE id = v_bed_id;
  UPDATE students SET bed_id = v_bed_id WHERE id = v_student_id;

  -- Insert guardian details
  INSERT INTO guardian_details (student_id, father_name, father_phone, mother_name, mother_phone, relationship)
  VALUES (v_student_id, TRIM(p_father_name), TRIM(p_father_phone), TRIM(p_mother_name), TRIM(p_mother_phone), TRIM(p_relationship));

  RETURN jsonb_build_object(
    'studentId', v_student_id,
    'userId', v_user_id,
    'roomNumber', TRIM(p_room_number),
    'block', p_block_name
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. allocate_student_to_room
-- Atomic student-to-room allocation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_student_to_room(p_room_id BIGINT, p_student_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_student students%ROWTYPE;
  v_current_bed beds%ROWTYPE;
  v_free_bed beds%ROWTYPE;
  v_occupied INT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0004';
  END IF;

  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found' USING ERRCODE = 'P0005';
  END IF;

  -- Sync beds
  PERFORM sync_beds_to_capacity(v_room.id, v_room.capacity);

  -- Check current allocation
  IF v_student.bed_id IS NOT NULL THEN
    SELECT * INTO v_current_bed FROM beds WHERE id = v_student.bed_id;
    IF FOUND AND v_current_bed.room_id = v_room.id THEN
      RAISE EXCEPTION 'This student is already allocated to this room' USING ERRCODE = 'P0006';
    END IF;
  END IF;

  -- Find free bed
  SELECT * INTO v_free_bed FROM beds
  WHERE room_id = v_room.id AND is_occupied = 0
  ORDER BY id ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This room is full' USING ERRCODE = 'P0007';
  END IF;

  -- Free old bed
  IF v_student.bed_id IS NOT NULL THEN
    UPDATE beds SET is_occupied = 0 WHERE id = v_student.bed_id;
  END IF;

  -- Assign new bed
  UPDATE beds SET is_occupied = 1 WHERE id = v_free_bed.id;
  UPDATE students SET bed_id = v_free_bed.id WHERE id = v_student.id;

  SELECT COUNT(*) INTO v_occupied FROM beds WHERE room_id = v_room.id AND is_occupied = 1;
  
  IF v_occupied = 0 THEN
    v_status := 'available';
  ELSIF v_occupied >= v_room.capacity THEN
    v_status := 'full';
  ELSE
    v_status := 'partial';
  END IF;

  RETURN jsonb_build_object(
    'roomId', v_room.id,
    'roomNumber', v_room.room_number,
    'occupied', v_occupied,
    'capacity', v_room.capacity,
    'status', v_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. deallocate_student_from_room
-- Atomic student-from-room deallocation
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deallocate_student_from_room(p_room_id BIGINT, p_student_id BIGINT)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_student students%ROWTYPE;
  v_bed beds%ROWTYPE;
  v_occupied INT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0004';
  END IF;

  SELECT * INTO v_student FROM students WHERE id = p_student_id;
  IF NOT FOUND OR v_student.bed_id IS NULL THEN
    RAISE EXCEPTION 'Student is not allocated to a room' USING ERRCODE = 'P0008';
  END IF;

  SELECT * INTO v_bed FROM beds WHERE id = v_student.bed_id;
  IF NOT FOUND OR v_bed.room_id != v_room.id THEN
    RAISE EXCEPTION 'Student is not allocated to this room' USING ERRCODE = 'P0009';
  END IF;

  UPDATE beds SET is_occupied = 0 WHERE id = v_bed.id;
  UPDATE students SET bed_id = NULL WHERE id = v_student.id;

  SELECT COUNT(*) INTO v_occupied FROM beds WHERE room_id = v_room.id AND is_occupied = 1;
  
  IF v_occupied = 0 THEN
    v_status := 'available';
  ELSIF v_occupied >= v_room.capacity THEN
    v_status := 'full';
  ELSE
    v_status := 'partial';
  END IF;

  RETURN jsonb_build_object(
    'roomId', v_room.id,
    'roomNumber', v_room.room_number,
    'occupied', v_occupied,
    'capacity', v_room.capacity,
    'status', v_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. update_room_details
-- Atomic update of room floor, number, capacity with bed synchronization
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_room_details(
  p_room_id BIGINT,
  p_floor INT,
  p_room_number TEXT,
  p_capacity INT
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_room rooms%ROWTYPE;
  v_occupied INT;
  v_next_capacity INT;
  v_next_floor INT;
  v_next_room_number TEXT;
  v_status TEXT;
BEGIN
  SELECT * INTO v_room FROM rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0004';
  END IF;

  SELECT COUNT(*) INTO v_occupied FROM beds WHERE room_id = v_room.id AND is_occupied = 1;

  v_next_capacity := COALESCE(p_capacity, v_room.capacity);
  v_next_floor := COALESCE(p_floor, v_room.floor);
  v_next_room_number := COALESCE(TRIM(p_room_number), v_room.room_number);

  IF v_next_capacity < v_occupied THEN
    RAISE EXCEPTION 'Capacity cannot be less than current occupied beds' USING ERRCODE = 'P0010';
  END IF;

  UPDATE rooms SET
    floor = v_next_floor,
    room_number = v_next_room_number,
    capacity = v_next_capacity
  WHERE id = v_room.id;

  IF p_capacity IS NOT NULL THEN
    PERFORM sync_beds_to_capacity(v_room.id, v_next_capacity);
  END IF;

  SELECT COUNT(*) INTO v_occupied FROM beds WHERE room_id = v_room.id AND is_occupied = 1;

  IF v_occupied = 0 THEN
    v_status := 'available';
  ELSIF v_occupied >= v_next_capacity THEN
    v_status := 'full';
  ELSE
    v_status := 'partial';
  END IF;

  RETURN jsonb_build_object(
    'id', v_room.id,
    'floor', v_next_floor,
    'roomNumber', v_next_room_number,
    'capacity', v_next_capacity,
    'occupied', v_occupied,
    'status', v_status
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. sync_all_sequences
-- Synchronizes BIGSERIAL primary key sequences with max existing table IDs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_all_sequences()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));
  PERFORM setval(pg_get_serial_sequence('blocks', 'id'), COALESCE((SELECT MAX(id) FROM blocks), 1));
  PERFORM setval(pg_get_serial_sequence('rooms', 'id'), COALESCE((SELECT MAX(id) FROM rooms), 1));
  PERFORM setval(pg_get_serial_sequence('beds', 'id'), COALESCE((SELECT MAX(id) FROM beds), 1));
  PERFORM setval(pg_get_serial_sequence('students', 'id'), COALESCE((SELECT MAX(id) FROM students), 1));
  PERFORM setval(pg_get_serial_sequence('guardian_details', 'id'), COALESCE((SELECT MAX(id) FROM guardian_details), 1));
  PERFORM setval(pg_get_serial_sequence('leaves', 'id'), COALESCE((SELECT MAX(id) FROM leaves), 1));
  PERFORM setval(pg_get_serial_sequence('complaints', 'id'), COALESCE((SELECT MAX(id) FROM complaints), 1));
  PERFORM setval(pg_get_serial_sequence('notices', 'id'), COALESCE((SELECT MAX(id) FROM notices), 1));
  PERFORM setval(pg_get_serial_sequence('attendance', 'id'), COALESCE((SELECT MAX(id) FROM attendance), 1));
  PERFORM setval(pg_get_serial_sequence('qr_checkpoints', 'id'), COALESCE((SELECT MAX(id) FROM qr_checkpoints), 1));
  PERFORM setval(pg_get_serial_sequence('meal_bookings', 'id'), COALESCE((SELECT MAX(id) FROM meal_bookings), 1));
END;
$$;

