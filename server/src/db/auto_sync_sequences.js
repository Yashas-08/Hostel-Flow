import 'dotenv/config';
import { supabase } from './index.js';

console.log('Synchronizing PostgreSQL sequence numbers via client...');

async function syncTableSequence(tableName, dummyDataGenerator, cleanupField = 'id') {
  console.log(`Syncing ${tableName}...`);
  for (let i = 0; i < 20; i++) {
    const dummy = dummyDataGenerator();
    const { data, error } = await supabase.from(tableName).insert(dummy).select();
    if (error) {
      if (error.code === '23505') {
        // Duplicate key value, sequence advanced! Try again until successful.
        continue;
      } else {
        console.error(`Error on ${tableName}:`, error.message);
        break;
      }
    }
    if (data && data.length > 0) {
      // Success! The sequence is now higher than any existing record.
      // Clean up the dummy row.
      const insertedId = data[0][cleanupField];
      await supabase.from(tableName).delete().eq(cleanupField, insertedId);
      console.log(`✓ ${tableName} sequence successfully synchronized (next ID: >${insertedId}).`);
      break;
    }
  }
}

async function main() {
  // Sync users
  await syncTableSequence('users', () => ({
    email: `seq_dummy_${Date.now()}_${Math.random()}@test.com`,
    password_hash: 'dummy',
    role: 'student',
    full_name: 'Sequence Dummy',
  }));

  // Sync beds
  await syncTableSequence('beds', () => ({
    room_id: 1,
    bed_number: `SEQ_DUMMY_${Date.now()}`,
    is_occupied: 0,
  }));

  // Sync students (requires valid user_id)
  const { data: dummyUser } = await supabase.from('users').insert({
    email: `student_seq_dummy_${Date.now()}@test.com`,
    password_hash: 'dummy',
    role: 'student',
    full_name: 'Student Seq Dummy',
  }).select().single();

  if (dummyUser) {
    await syncTableSequence('students', () => ({
      user_id: dummyUser.id,
      student_code: `HF-SEQ-${Date.now()}-${Math.random()}`,
      course: 'Test',
      year: 1,
    }));
    await supabase.from('users').delete().eq('id', dummyUser.id);
  }

  // Sync notices
  await syncTableSequence('notices', () => ({
    title: `Seq Dummy Notice ${Date.now()}`,
    description: 'Dummy',
    created_by: 1,
  }));

  // Sync meal_bookings
  await syncTableSequence('meal_bookings', () => ({
    student_id: 1,
    date: '2099-01-01',
    meal_type: 'breakfast',
    status: 'booked',
    qr_code: `MEAL-SEQ-${Date.now()}-${Math.random()}`,
  }));

  // Sync leaves
  await syncTableSequence('leaves', () => ({
    student_id: 1,
    leave_type: 'Home Visit',
    start_date: '2099-01-01',
    end_date: '2099-01-02',
    reason: 'Seq Dummy Leave',
    status: 'pending',
  }));

  // Sync complaints
  await syncTableSequence('complaints', () => ({
    student_id: 1,
    category: 'Other',
    title: 'Seq Dummy Complaint',
    description: 'Dummy',
    status: 'submitted',
  }));

  console.log('\nAll sequences synchronized automatically!');
}

main();
