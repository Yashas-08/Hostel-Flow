export type Role = 'student' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  fullName: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface RoomInfo {
  roomNumber: string;
  floor: number;
  block: string;
  hostel: string;
  bedNumber: string;
  roommates: { fullName: string; bedNumber: string }[];
}

export interface DashboardSummary {
  attendanceStatus: 'present' | 'absent' | 'on_leave' | 'not_checked_in';
  pendingLeave: { id: number; leaveType: string; startDate: string; endDate: string } | null;
  upcomingLeave: { id: number; leaveType: string; startDate: string; endDate: string } | null;
}

export interface Notice {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string | null;
  appliedAt: string;
  days: number;
  qrCode?: string | null;
  checkedOutAt?: string | null;
  checkedInAt?: string | null;
}

export interface CheckInResult {
  id: number;
  status: 'present';
  checkedInAt: string;
  checkpointLabel: string;
}

export interface TodayAttendance {
  checkedIn: boolean;
  checkedInAt?: string;
  status?: string;
}

export type ComplaintStatus = 'submitted' | 'in_progress' | 'resolved' | 'rejected';
export type ComplaintPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Complaint {
  id: number;
  category: string;
  title: string;
  description: string;
  imageUrl: string | null;
  location: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  studentCode: string;
  course?: string | null;
  year?: number | null;
}

export interface NotificationPrefs {
  leaveUpdates: boolean;
  complaintUpdates: boolean;
  notices: boolean;
}

export interface AdminProfile {
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface AdminActivityItem {
  type: 'leave' | 'complaint' | 'attendance' | 'notice';
  id: number;
  occurredAt: string;
  studentName: string | null;
  detail: string;
  status: string;
}

export interface AdminDashboardSummary {
  totalStudents: number;
  rooms: { occupied: number; total: number };
  pendingLeaves: number;
  pendingComplaints: number;
  attendanceToday: { present: number; totalStudents: number };
  recentActivity: AdminActivityItem[];
}

// ---- Admin management (Phase 11) ----

export type Gender = 'male' | 'female';

export interface GuardianDetails {
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  motherPhone: string;
  relationship: string;
}

export interface AdmissionResult {
  id: number;
  fullName: string;
  studentCode: string;
  email: string;
  tempPassword: string;
  block: string;
  roomNumber: string;
}

export interface AdminStudentSummary {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  gender: Gender | null;
  course: string | null;
  year: number | null;
  room: { roomNumber: string; block: string } | null;
  status: string;
}

export interface AdminStudentDetail {
  id: number;
  studentCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  gender: Gender | null;
  dateOfBirth: string | null;
  course: string | null;
  department: string | null;
  year: number | null;
  room: { roomId: number; roomNumber: string; floor: number; block: string; hostel: string } | null;
  guardian: GuardianDetails | null;
  leaves: LeaveRequest[];
  complaints: Complaint[];
  attendance: {
    recent: { date: string; status: string; checkedInAt: string | null }[];
    presentDaysTotal: number;
  };
}

export type RoomStatus = 'available' | 'partial' | 'full';

export interface AdminRoomSummary {
  id: number;
  floor: number;
  roomNumber: string;
  capacity: number;
  block: string;
  blockId: number;
  occupied: number;
  status: RoomStatus;
}

export interface AdminRoomDetail {
  id: number;
  floor: number;
  roomNumber: string;
  capacity: number;
  block: string;
  hostel: string;
  occupied: number;
  status: RoomStatus;
  occupants: { id: number; studentCode: string; fullName: string }[];
}

export interface AdminBlock {
  id: number;
  name: string;
  hostelName: string;
}

export interface AdminLeaveSummary {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  appliedAt: string;
  studentId: number;
  studentCode: string;
  studentName: string;
  days: number;
}

export interface AdminLeaveDetail extends AdminLeaveSummary {
  rejectionReason: string | null;
  decidedAt: string | null;
  checkedOutAt: string | null;
  checkedInAt: string | null;
}

export interface AdminComplaintSummary {
  id: number;
  category: string;
  title: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  createdAt: string;
  updatedAt: string;
  studentId: number;
  studentCode: string;
  studentName: string;
}

export interface AdminComplaintDetail extends AdminComplaintSummary {
  description: string;
  imageUrl: string | null;
  location: string | null;
  resolutionNotes: string | null;
}

export interface AdminNotice {
  id: number;
  title: string;
  description: string;
  category: string;
  priority: 'normal' | 'important' | 'urgent';
  published: boolean;
  createdAt: string;
}

// ---- Meal booking ----

export type MealType = 'breakfast' | 'lunch' | 'dinner';
export type MealBookingStatus = 'booked' | 'consumed' | 'cancelled';

export interface MealSlot {
  mealType: MealType;
  label: string;
  timeLabel: string;
  booked: boolean;
  status: MealBookingStatus | null;
  bookingId: number | null;
  bookable: boolean;
}

export interface MealDay {
  date: string;
  label: string;
  meals: MealSlot[];
}

export interface MealsResponse {
  days: MealDay[];
  bookingWindowOpen: boolean;
}

export interface MealBookingDetail {
  id: number;
  date: string;
  mealType: MealType;
  status: MealBookingStatus;
  qrCode: string;
  bookedAt: string;
  consumedAt: string | null;
  label: string;
  timeLabel: string;
}
