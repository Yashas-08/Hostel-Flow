import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_DB_PATH = path.join(__dirname, 'hostel_flow.db');

console.log('================================================================');
console.log('HOSTEL FLOW: SQLITE -> SUPABASE DATA MIGRATION');
console.log('================================================================');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in server/.env');
  process.exit(1);
}

// Open SQLite Database (read-only mode)
const sqlite = new Database(SQLITE_DB_PATH, { readonly: true });
console.log('✓ SQLite database opened in READ-ONLY mode from:', SQLITE_DB_PATH);

async function migrate() {
  try {
    // ------------------------------------------------------------------------
    // Step 1: Blocks (Canonical Normalization: 1: M Block [Girls], 2: R Block [Boys])
    // ------------------------------------------------------------------------
    console.log('\n[1/10] Migrating & Normalizing Blocks...');
    const canonicalBlocks = [
      { id: 1, name: 'M Block', hostel_name: 'Hostel Flow Residency' },
      { id: 2, name: 'R Block', hostel_name: 'Hostel Flow Residency' },
    ];
    
    const { error: blockErr } = await supabase
      .from('blocks')
      .upsert(canonicalBlocks, { onConflict: 'id' });
      
    if (blockErr) throw new Error(`Blocks migration failed: ${blockErr.message}`);
    console.log('✓ Canonical blocks established: M Block (Girls, ID 1), R Block (Boys, ID 2)');
    console.log('ℹ Normalization: Legacy Block C will be mapped to M Block (Girls Hostel) for Room 214.');

    // ------------------------------------------------------------------------
    // Step 2: Users
    // ------------------------------------------------------------------------
    console.log('\n[2/10] Migrating Users...');
    const users = sqlite.prepare('SELECT * FROM users ORDER BY id ASC').all();
    console.log(`Found ${users.length} users in SQLite.`);
    
    if (users.length > 0) {
      const { error: userErr } = await supabase
        .from('users')
        .upsert(users, { onConflict: 'id' });
      if (userErr) throw new Error(`Users migration failed: ${userErr.message}`);
      console.log(`✓ Migrated ${users.length} users successfully.`);
    }

    // ------------------------------------------------------------------------
    // Step 3: Rooms (Normalize block_id: legacy 3 -> 1 for M Block)
    // ------------------------------------------------------------------------
    console.log('\n[3/10] Migrating Rooms...');
    const rooms = sqlite.prepare('SELECT * FROM rooms ORDER BY id ASC').all();
    const normalizedRooms = rooms.map(r => {
      // If room points to legacy Block C (id: 3), map to M Block (id: 1)
      const block_id = (r.block_id === 3 || r.block_id > 2) ? 1 : r.block_id;
      return {
        id: r.id,
        block_id,
        floor: r.floor,
        room_number: r.room_number,
        capacity: r.capacity
      };
    });
    
    if (normalizedRooms.length > 0) {
      const { error: roomErr } = await supabase
        .from('rooms')
        .upsert(normalizedRooms, { onConflict: 'id' });
      if (roomErr) throw new Error(`Rooms migration failed: ${roomErr.message}`);
      console.log(`✓ Migrated ${normalizedRooms.length} rooms (Room 214 mapped to M Block [block_id: 1]).`);
    }

    // ------------------------------------------------------------------------
    // Step 4: Beds
    // ------------------------------------------------------------------------
    console.log('\n[4/10] Migrating Beds...');
    const beds = sqlite.prepare('SELECT * FROM beds ORDER BY id ASC').all();
    if (beds.length > 0) {
      const { error: bedErr } = await supabase
        .from('beds')
        .upsert(beds, { onConflict: 'id' });
      if (bedErr) throw new Error(`Beds migration failed: ${bedErr.message}`);
      console.log(`✓ Migrated ${beds.length} beds successfully.`);
    }

    // ------------------------------------------------------------------------
    // Step 5: Students
    // ------------------------------------------------------------------------
    console.log('\n[5/10] Migrating Students...');
    const students = sqlite.prepare('SELECT * FROM students ORDER BY id ASC').all();
    if (students.length > 0) {
      const { error: studentErr } = await supabase
        .from('students')
        .upsert(students, { onConflict: 'id' });
      if (studentErr) throw new Error(`Students migration failed: ${studentErr.message}`);
      console.log(`✓ Migrated ${students.length} students successfully.`);
    }

    // ------------------------------------------------------------------------
    // Step 6: Guardian Details
    // ------------------------------------------------------------------------
    console.log('\n[6/10] Migrating Guardian Details...');
    const guardians = sqlite.prepare('SELECT * FROM guardian_details ORDER BY id ASC').all();
    if (guardians.length > 0) {
      const { error: gErr } = await supabase
        .from('guardian_details')
        .upsert(guardians, { onConflict: 'id' });
      if (gErr) throw new Error(`Guardian details migration failed: ${gErr.message}`);
      console.log(`✓ Migrated ${guardians.length} guardian detail records.`);
    } else {
      console.log('✓ 0 guardian details to migrate (table empty in source).');
    }

    // ------------------------------------------------------------------------
    // Step 7: Leaves
    // ------------------------------------------------------------------------
    console.log('\n[7/10] Migrating Leaves...');
    const leaves = sqlite.prepare('SELECT * FROM leaves ORDER BY id ASC').all();
    if (leaves.length > 0) {
      const { error: leaveErr } = await supabase
        .from('leaves')
        .upsert(leaves, { onConflict: 'id' });
      if (leaveErr) throw new Error(`Leaves migration failed: ${leaveErr.message}`);
      console.log(`✓ Migrated ${leaves.length} leave records successfully.`);
    }

    // ------------------------------------------------------------------------
    // Step 8: Complaints
    // ------------------------------------------------------------------------
    console.log('\n[8/10] Migrating Complaints...');
    const complaints = sqlite.prepare('SELECT * FROM complaints ORDER BY id ASC').all();
    if (complaints.length > 0) {
      const { error: compErr } = await supabase
        .from('complaints')
        .upsert(complaints, { onConflict: 'id' });
      if (compErr) throw new Error(`Complaints migration failed: ${compErr.message}`);
      console.log(`✓ Migrated ${complaints.length} complaint records.`);
    } else {
      console.log('✓ 0 complaints to migrate (table empty in source).');
    }

    // ------------------------------------------------------------------------
    // Step 9: Notices
    // ------------------------------------------------------------------------
    console.log('\n[9/10] Migrating Notices...');
    const notices = sqlite.prepare('SELECT * FROM notices ORDER BY id ASC').all();
    if (notices.length > 0) {
      const { error: noticeErr } = await supabase
        .from('notices')
        .upsert(notices, { onConflict: 'id' });
      if (noticeErr) throw new Error(`Notices migration failed: ${noticeErr.message}`);
      console.log(`✓ Migrated ${notices.length} notices successfully.`);
    }

    // ------------------------------------------------------------------------
    // Step 10: Attendance, Checkpoints & Meal Bookings
    // ------------------------------------------------------------------------
    console.log('\n[10/10] Migrating Attendance, Checkpoints & Meal Bookings...');
    const attendance = sqlite.prepare('SELECT * FROM attendance ORDER BY id ASC').all();
    if (attendance.length > 0) {
      const { error: attErr } = await supabase.from('attendance').upsert(attendance, { onConflict: 'id' });
      if (attErr) throw new Error(`Attendance migration failed: ${attErr.message}`);
      console.log(`✓ Migrated ${attendance.length} attendance records.`);
    }

    const checkpoints = sqlite.prepare('SELECT * FROM qr_checkpoints ORDER BY id ASC').all();
    if (checkpoints.length > 0) {
      const { error: cpErr } = await supabase.from('qr_checkpoints').upsert(checkpoints, { onConflict: 'id' });
      if (cpErr) throw new Error(`QR Checkpoints migration failed: ${cpErr.message}`);
      console.log(`✓ Migrated ${checkpoints.length} QR checkpoint records.`);
    }

    const mealBookings = sqlite.prepare('SELECT * FROM meal_bookings ORDER BY id ASC').all();
    if (mealBookings.length > 0) {
      const { error: mbErr } = await supabase.from('meal_bookings').upsert(mealBookings, { onConflict: 'id' });
      if (mbErr) throw new Error(`Meal bookings migration failed: ${mbErr.message}`);
      console.log(`✓ Migrated ${mealBookings.length} meal booking records.`);
    }

    // Synchronize PostgreSQL sequences so new inserts don't collide with migrated IDs
    console.log('\n[11/11] Synchronizing PostgreSQL ID sequences...');
    const { error: seqErr } = await supabase.rpc('sync_all_sequences');
    if (seqErr) {
      console.warn('⚠️ Sequence sync warning (will sync when RPC is created):', seqErr.message);
    } else {
      console.log('✓ All 12 table primary key sequences synchronized successfully.');
    }

    console.log('\n================================================================');
    console.log('✓ DATA MIGRATION TO SUPABASE COMPLETED SUCCESSFULLY!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ MIGRATION ERROR:', err.message);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

migrate();
