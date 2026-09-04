-- ==============================================================================
-- HOSTEL FLOW: SAFE PRODUCTION DATA CLEANUP SCRIPT
-- ==============================================================================
-- NOTE: DO NOT RUN THIS SCRIPT BLINDLY.
-- Review the records and dependencies identified below before execution.
--
-- This script removes all automated test artifacts and demo development data
-- while preserving:
--  1. The complete database schema and constraints
--  2. The primary Admin account (admin@hostelflow.app, Priya Nair)
--  3. Physical infrastructure:
--     - blocks (M Block, R Block)
--     - qr_checkpoints (HOSTEL-FLOW-BLOCKC-MAIN-GATE)
--  4. Baseline test student fixture (asha.rao@hostelflow.app) if retained for automated verification.
-- ==============================================================================

BEGIN;

-- 1. Remove automated test notices and sample notices
DELETE FROM notices 
WHERE title LIKE 'Supabase Migration Notice%' 
   OR title IN ('Water supply maintenance on Aug 16', 'Mess menu updated for this week', 'Fire safety drill - mandatory attendance');

-- 2. Remove test complaints
DELETE FROM complaints 
WHERE title LIKE 'Test Complaint%' 
   OR description LIKE '%test%' 
   OR location LIKE '%Room 214%';

-- 3. Remove attendance records created during testing
DELETE FROM attendance 
WHERE qr_ref LIKE 'QR-TEST-%' 
   OR student_id IN (
       SELECT s.id FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.email LIKE 'vikram.%@hostelflow.app' OR u.email = 'devika.menon@hostelflow.app'
   );

-- 4. Remove meal bookings generated during test runs
DELETE FROM meal_bookings 
WHERE qr_code LIKE 'MEAL-TEST-%' 
   OR student_id IN (
       SELECT s.id FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.email LIKE 'vikram.%@hostelflow.app' OR u.email = 'devika.menon@hostelflow.app'
   );

-- 5. Remove leave requests generated during testing or initial demo seeding
DELETE FROM leaves 
WHERE reason IN ('Family function', 'Doctor appointment', 'Weekend visit to hometown')
   OR qr_code LIKE 'LEAVE-TEST-%'
   OR student_id IN (
       SELECT s.id FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE u.email LIKE 'vikram.%@hostelflow.app' OR u.email = 'devika.menon@hostelflow.app'
   );

-- 6. Remove guardian details for test students
DELETE FROM guardian_details 
WHERE student_id IN (
    SELECT s.id FROM students s 
    JOIN users u ON s.user_id = u.id 
    WHERE u.email LIKE 'vikram.%@hostelflow.app' OR u.email = 'devika.menon@hostelflow.app'
);

-- 7. Unlink beds assigned to test students
UPDATE students 
SET bed_id = NULL 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE 'vikram.%@hostelflow.app' OR email = 'devika.menon@hostelflow.app'
);

-- 8. Remove test student profile records
DELETE FROM students 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE 'vikram.%@hostelflow.app' OR email = 'devika.menon@hostelflow.app'
);

-- 9. Clean up test beds and test rooms created dynamically during verify runs (room_number LIKE 'R-%')
DELETE FROM beds 
WHERE room_id IN (
    SELECT id FROM rooms WHERE room_number LIKE 'R-%'
);

DELETE FROM rooms 
WHERE room_number LIKE 'R-%';

-- 10. Delete test user accounts (preserving the required administrator)
DELETE FROM users 
WHERE email LIKE 'vikram.%@hostelflow.app' 
   OR email = 'devika.menon@hostelflow.app';

COMMIT;
