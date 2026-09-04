-- Hostel Flow schema
-- Entities: users, students, admins, blocks, rooms, beds, leaves, complaints, notices, attendance

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  hostel_name TEXT NOT NULL DEFAULT 'Hostel Flow Residency'
);

CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  block_id INTEGER NOT NULL REFERENCES blocks(id),
  floor INTEGER NOT NULL,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2
);

CREATE TABLE IF NOT EXISTS beds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  bed_number TEXT NOT NULL,
  is_occupied INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
  student_code TEXT UNIQUE NOT NULL,
  course TEXT,
  department TEXT,
  year INTEGER,
  bed_id INTEGER REFERENCES beds(id)
);

-- Admission workflow: dedicated, typed parent/guardian record per student (not an
-- unstructured string). One row per student.
CREATE TABLE IF NOT EXISTS guardian_details (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER UNIQUE NOT NULL REFERENCES students(id),
  father_name TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_phone TEXT,
  relationship TEXT
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  leave_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  rejection_reason TEXT,
  applied_at TEXT DEFAULT (datetime('now')),
  decided_at TEXT,
  qr_code TEXT,
  checked_out_at TEXT,
  checked_in_at TEXT
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  location TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_progress','resolved','rejected')),
  resolution_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','important','urgent')),
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','on_leave')),
  checked_in_at TEXT,
  qr_ref TEXT,
  UNIQUE(student_id, date)
);

-- Phase 6: physical check-in points. A QR code printed/displayed at a hostel gate
-- encodes one of these `code` values. Scanning validates against this table so
-- "invalid QR" (unknown code) is a real, checkable condition, not a UI guess.
CREATE TABLE IF NOT EXISTS qr_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Meal booking: students book tomorrow's breakfast/lunch/dinner independently; each
-- booking gets its own unique QR the admin scans at the mess entrance to mark it consumed.
CREATE TABLE IF NOT EXISTS meal_bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id),
  date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'consumed', 'cancelled')),
  qr_code TEXT UNIQUE NOT NULL,
  booked_at TEXT DEFAULT (datetime('now')),
  consumed_at TEXT,
  UNIQUE(student_id, date, meal_type)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
