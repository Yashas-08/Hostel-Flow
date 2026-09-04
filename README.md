# Hostel Flow

Mobile-first hostel management app. Two roles: Student and Admin.

## Status: Phases 1–11 done and verified. Phase 12 not started.

### Working end-to-end (real backend, no mock data)
- Auth: JWT login, bcrypt password hashing, session restore (`/api/auth/login`, `/api/auth/me`)
- Role-based routing: student/admin split at the router; a student hitting an admin URL
  (or vice versa) is redirected server-side too — the API rejects the wrong role with 403
  regardless of what the frontend sends
- Student Dashboard: room card (room/floor/block/bed/roommates from real relations),
  quick actions, attendance/leave status, recent notices
- Notices: list + detail
- Leave: apply (with client + server validation), history, detail, cancel (only while pending)
- Student Profile: real data + logout
- Design system primitives: Button, Card, Input/Select/Textarea, StatusBadge, Avatar,
  BottomNav, Header, EmptyState/LoadingState/ErrorState
- Every screen has loading, error (with retry), and empty states — nothing renders blank/broken
- Correct REST status codes throughout (200/201/400 w/ field errors/401/403/404)
- QR Scanner + Attendance (Phase 6): real camera capture via `getUserMedia` + `jsQR`
  decode loop, validated against a `qr_checkpoints` table on the backend (not a hardcoded
  string in the frontend). Handles: camera permission denied/no camera/unsupported browser,
  invalid QR (404), already-checked-in-today (409, enforced by a DB unique constraint on
  `(student_id, date)`), missing/malformed QR payload (400), network/server failure (502
  from a dead backend correctly surfaces as a retryable network banner), and a processing
  state while the check-in request is in flight. After any result the scanner clears itself
  and resumes automatically — no navigating away and back. A "trouble scanning? enter
  code manually" fallback covers low-light/broken-camera cases and doubles as an
  accessibility affordance. Verified end-to-end against real SQLite writes, not mocked.
- Complaints (Phase 7): full create/list/detail workflow against the pre-existing
  `complaints` table (category, title, description, image_url, location, priority, status,
  resolution_notes — all reused as-is, no schema changes). Server-side validation for
  category/title/description/priority/image, 400 with field-level errors on bad input.
  Students can only ever see their own complaints — cross-student access returns 404
  (not 403), so a guessed ID can't even confirm another complaint exists. Optional photo
  attachment is a real client-side-resized-free base64 data URI stored directly in the
  existing `image_url` column (capped at ~2MB) — see Limitations below for why, and what
  a production version would do differently.
- Student Profile (Phase 9): real hostel/block/room number (no bed — Hostel Flow's
  student-facing profile is room-only by design), student ID/course/year/email read-only
  (admin-managed), phone + photo self-editable via a real `PATCH /students/me`, and
  working notification-preference toggles (leave updates / complaint updates / hostel
  notices) backed by real DB columns with optimistic UI + rollback on failure. Two new
  additive columns/table changes (`blocks.hostel_name`, three `users.notify_*` booleans),
  migrated idempotently on an already-existing database — no destructive changes, no data
  loss (verified: user/notice/leave/complaint/attendance counts unchanged after migration).
- Admin Dashboard (Phase 10): real stats from `GET /api/admin/dashboard` — total students,
  occupied/total rooms (room-only, no bed count exposed — occupancy is computed from bed
  allocation internally but never surfaced as a bed statistic), pending leaves (status =
  pending), pending complaints (submitted + in_progress), today's attendance (present /
  total), and a recent-activity feed unioned across leaves/complaints/check-ins/notices.
  All numbers verified against direct SQL queries on the same database — exact match.
  Quick actions link to the three admin routes that already existed pre-Phase-10 (Rooms,
  Notices, Settings) — each now honestly shows "coming in Phase 11" instead of silently
  reusing the dashboard's content, which is what they did before this phase.
- Admin Management (Phase 11): full CRUD/workflow screens for all five management areas —
  **Students** (search/filter, detail with room + leave/complaint history + attendance),
  **Rooms** (list/filter by block+status, allocate/deallocate students, edit floor/room
  number/capacity — room-only throughout, bed allocation stays a purely internal occupancy
  mechanism never exposed in any API response or UI, grep-verified), **Leaves**
  (list/filter/search, approve, reject with a required reason — student sees the update
  immediately via the existing Phase 5 leave detail screen), **Complaints** (list/filter/
  search, status transitions, resolution notes — student's history stays intact after
  resolution), **Notices** (create/edit/delete/publish-toggle, reusing the exact same
  `notices` table Phase 8 students already read from — publishing is instantly visible to
  students, deleting/unpublishing instantly hides it). Dashboard quick actions expanded
  from 3 to all 6 admin sections; bottom nav intentionally left unchanged (Dashboard,
  Rooms, Notices, Settings) to keep it thumb-friendly — Students/Leaves/Complaints are
  reached via quick actions, same pattern as student-side sub-navigation.

### Explicitly NOT built yet (placeholder screens say so honestly, no fake data)
- Admin profile/settings screen (never was in scope for Phase 11 — not one of its 5
  management sections)

### Known limitation: complaint image storage
No file-upload/object-storage service existed in the project before this phase, and the
spec explicitly said not to introduce one just for this. Images are stored as base64 data
URIs directly in the `complaints.image_url` TEXT column. This is real and fully working
(uploads, persists, renders) but doesn't scale — every complaint with a photo adds up to
~2.8MB of base64 text to the SQLite row. Fine for a demo/small deployment; a production
build should move this to disk or object storage (S3/GCS) with `image_url` holding a path
or URL instead of the raw bytes.

## Stack
- Backend: Node.js + Express + Supabase PostgreSQL (`/server`), JWT auth, REST API
- Frontend: React + TypeScript + Vite + Tailwind v4 + React Router (`/client`)
- Database: Dedicated Supabase PostgreSQL project

## Supabase PostgreSQL Setup & Migration

1. **Environment Configuration**:
   Configure `server/.env`:
   ```env
   PORT=4000
   NODE_ENV=development
   JWT_SECRET=<your-jwt-secret>
   FRONTEND_URL=http://localhost:5173
   SUPABASE_URL=https://smdjxwqlpwrpjzerkjhp.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-hostel-flow-service-role-key>
   ```

2. **Schema & Migration**:
   - The PostgreSQL schema and atomic RPC transaction functions are defined in `server/db/supabase-schema.sql`.
   - SQLite data was cleanly migrated to Supabase via `node src/db/migrate_data.js` with canonical **Block C → M Block** normalization.
   - Run verification tests anytime using `node src/db/verify_migration.js` and `node src/db/verify_api.js`.

## Running the Application

```bash
# Backend (Server)
cd server
npm install
npm run dev       # http://localhost:4000

# Frontend (Client)
cd client
npm install
npm run dev        # http://localhost:5173, proxies /api to :4000
```

Demo accounts (password `password123` for both):
- Student: `asha.rao@hostelflow.app`
- Admin: `admin@hostelflow.app`

## Next steps (in spec order)
Phase 12 (final polish/testing pass).
