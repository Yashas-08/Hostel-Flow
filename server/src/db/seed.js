import bcrypt from 'bcryptjs';
import db from './index.js';

// SAFETY: Prevent seed script from running in production or against remote environments
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  console.error('FATAL: Seed script cannot run in production or deployment environments.');
  console.error('Seeding demo data is strictly for local SQLite development only.');
  console.error('To create accounts in production, use the admin admission UI.');
  process.exit(1);
}

const hasUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if (hasUsers > 0) {
  console.log('Database already seeded. Skipping.');
  process.exit(0);
}

const insertUser = db.prepare(
  `INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?, ?, ?, ?, ?)`
);

const pass = bcrypt.hashSync('password123', 10);

const adminId = insertUser.run('admin@hostelflow.app', pass, 'admin', 'Priya Nair', '+91 90000 10001').lastInsertRowid;
const studentUserId = insertUser.run('asha.rao@hostelflow.app', pass, 'student', 'Asha Rao', '+91 90000 20002').lastInsertRowid;

const blockId = db.prepare(`INSERT INTO blocks (name) VALUES (?)`).run('Block C').lastInsertRowid;
const roomId = db.prepare(`INSERT INTO rooms (block_id, floor, room_number, capacity) VALUES (?, ?, ?, ?)`)
  .run(blockId, 2, '214', 3).lastInsertRowid;

const bed1 = db.prepare(`INSERT INTO beds (room_id, bed_number, is_occupied) VALUES (?, ?, 1)`).run(roomId, 'A').lastInsertRowid;
db.prepare(`INSERT INTO beds (room_id, bed_number, is_occupied) VALUES (?, ?, 1)`).run(roomId, 'B');
db.prepare(`INSERT INTO beds (room_id, bed_number, is_occupied) VALUES (?, ?, 0)`).run(roomId, 'C');

const studentId = db.prepare(
  `INSERT INTO students (user_id, student_code, course, year, bed_id) VALUES (?, ?, ?, ?, ?)`
).run(studentUserId, 'HF-2024-0142', 'B.Tech CSE', 2, bed1).lastInsertRowid;

// A roommate for the room card
const roommateUserId = insertUser.run('devika.menon@hostelflow.app', pass, 'student', 'Devika Menon', '+91 90000 20003').lastInsertRowid;
const bed2 = db.prepare(`SELECT id FROM beds WHERE room_id = ? AND bed_number = 'B'`).get(roomId).id;
db.prepare(`INSERT INTO students (user_id, student_code, course, year, bed_id) VALUES (?, ?, ?, ?, ?)`)
  .run(roommateUserId, 'HF-2024-0143', 'B.Tech CSE', 2, bed2);

db.prepare(`INSERT INTO leaves (student_id, leave_type, start_date, end_date, reason, status, applied_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-3 day'))`)
  .run(studentId, 'Home Visit', '2026-08-20', '2026-08-23', 'Family function', 'pending');
db.prepare(`INSERT INTO leaves (student_id, leave_type, start_date, end_date, reason, status, applied_at, decided_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-10 day'), datetime('now', '-9 day'))`)
  .run(studentId, 'Medical', '2026-07-30', '2026-07-31', 'Doctor appointment', 'approved');

db.prepare(`INSERT INTO notices (title, description, category, priority, created_by) VALUES (?, ?, ?, ?, ?)`)
  .run('Water supply maintenance on Aug 16', 'Water supply in Block C will be temporarily suspended between 10 AM and 2 PM for tank cleaning.', 'maintenance', 'important', adminId);
db.prepare(`INSERT INTO notices (title, description, category, priority, created_by) VALUES (?, ?, ?, ?, ?)`)
  .run('Mess menu updated for this week', 'The weekly mess menu has been revised. Check the notice board outside the dining hall for details.', 'general', 'normal', adminId);
db.prepare(`INSERT INTO notices (title, description, category, priority, created_by) VALUES (?, ?, ?, ?, ?)`)
  .run('Fire safety drill - mandatory attendance', 'A mandatory fire safety drill will be conducted for all residents. Please assemble at the ground floor lobby.', 'safety', 'urgent', adminId);

db.prepare(`INSERT INTO attendance (student_id, date, status, checked_in_at) VALUES (?, date('now'), 'present', datetime('now', '-2 hour'))`)
  .run(studentId);

console.log('✓ Seed complete.');
if (process.env.NODE_ENV !== 'production') {
  console.log('');
  console.log('📝 Development credentials (for testing only):');
  console.log('   Admin:   admin@hostelflow.app / password123');
  console.log('   Student: asha.rao@hostelflow.app / password123');
  console.log('');
  console.log('⚠️  Change these passwords after first login.');
}
