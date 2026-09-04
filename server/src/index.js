import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import noticeRoutes from './routes/notices.js';
import leaveRoutes from './routes/leaves.js';
import attendanceRoutes from './routes/attendance.js';
import complaintRoutes from './routes/complaints.js';
import adminRoutes from './routes/admin.js';
import adminStudentRoutes from './routes/adminStudents.js';
import adminRoomRoutes from './routes/adminRooms.js';
import adminLeaveRoutes from './routes/adminLeaves.js';
import adminComplaintRoutes from './routes/adminComplaints.js';
import adminNoticeRoutes from './routes/adminNotices.js';
import mealRoutes from './routes/meals.js';
import adminMealRoutes from './routes/adminMeals.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

// CORS configuration: support configured FRONTEND_URL, same-origin, local dev, and Vercel domains
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin, curl, server-to-server, or requests without origin header
    if (!origin) return callback(null, true);

    // Allow configured FRONTEND_URL
    if (origin === FRONTEND_URL || origin === FRONTEND_URL.replace(/\/$/, '')) {
      return callback(null, true);
    }

    // Allow local dev and Vercel preview/production domains
    try {
      const { hostname } = new URL(origin);
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
    } catch {
      // Invalid URL format
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Default 100kb is too small for the optional base64 complaint image (Phase 7);
// raised modestly rather than adopting a separate file-storage service.
app.use(express.json({ limit: '3mb' }));

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin/students', adminStudentRoutes);
app.use('/api/admin/rooms', adminRoomRoutes);
app.use('/api/admin/leaves', adminLeaveRoutes);
app.use('/api/admin/complaints', adminComplaintRoutes);
app.use('/api/admin/notices', adminNoticeRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/admin/meals', adminMealRoutes);
app.use('/api/admin', adminRoutes);

// 404 for unmatched API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Resource not found' }));

// Generic error handler
app.use((err, req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    console.error(err);
  } else {
    console.error(`[ERROR] ${new Date().toISOString()}: ${err.message}`);
  }
  res.status(500).json({ error: 'Internal server error' });
});

if (!process.env.VERCEL) {
  const isDev = process.env.NODE_ENV !== 'production';
  const protocol = isDev ? 'http' : 'https';
  const host = isDev ? 'localhost' : 'api.hostelflow.example.com';
  console.log(`Hostel Flow API running on ${protocol}://${host}:${PORT}`);

  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });
}

export default app;
