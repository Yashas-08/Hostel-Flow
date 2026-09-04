import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedLayout, RequireGuest } from './components/ProtectedLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import StudentDashboard from './pages/student/StudentDashboard';
import NoticesPage from './pages/student/NoticesPage';
import NoticeDetailPage from './pages/student/NoticeDetailPage';
import LeavePage from './pages/student/LeavePage';
import LeaveApplyPage from './pages/student/LeaveApplyPage';
import LeaveDetailPage from './pages/student/LeaveDetailPage';
import LeaveQrPage from './pages/student/LeaveQrPage';
import ComplaintsPage from './pages/student/ComplaintsPage';
import ComplaintApplyPage from './pages/student/ComplaintApplyPage';
import ComplaintDetailPage from './pages/student/ComplaintDetailPage';
import ScanPage from './pages/student/ScanPage';
import MealsPage from './pages/student/MealsPage';
import MealQrPage from './pages/student/MealQrPage';
import ProfilePage from './pages/student/ProfilePage';
import EditProfilePage from './pages/student/EditProfilePage';
import NotificationSettingsPage from './pages/student/NotificationSettingsPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminStudentsPage from './pages/admin/AdminStudentsPage';
import AdminStudentDetailPage from './pages/admin/AdminStudentDetailPage';
import AdminStudentAdmitPage from './pages/admin/AdminStudentAdmitPage';
import AdminRoomsPage from './pages/admin/AdminRoomsPage';
import AdminRoomDetailPage from './pages/admin/AdminRoomDetailPage';
import AdminLeavesPage from './pages/admin/AdminLeavesPage';
import AdminLeaveDetailPage from './pages/admin/AdminLeaveDetailPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminComplaintDetailPage from './pages/admin/AdminComplaintDetailPage';
import AdminNoticesPage from './pages/admin/AdminNoticesPage';
import AdminNoticeFormPage from './pages/admin/AdminNoticeFormPage';
import AdminScannerHubPage from './pages/admin/AdminScannerHubPage';
import AdminScannerPage from './pages/admin/AdminScannerPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import AdminEditProfilePage from './pages/admin/AdminEditProfilePage';
import AdminNotificationSettingsPage from './pages/admin/AdminNotificationSettingsPage';
import AdminChangePasswordPage from './pages/admin/AdminChangePasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
          <Route path="/signup" element={<RequireGuest><Signup /></RequireGuest>} />
          <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />
          <Route path="/reset-password" element={<RequireGuest><ResetPassword /></RequireGuest>} />

          <Route path="/student" element={<ProtectedLayout role="student" />}>
            <Route index element={<StudentDashboard />} />
            <Route path="notices" element={<NoticesPage />} />
            <Route path="notices/:id" element={<NoticeDetailPage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="leave/new" element={<LeaveApplyPage />} />
            <Route path="leave/:id" element={<LeaveDetailPage />} />
            <Route path="leave/:id/qr" element={<LeaveQrPage />} />
            <Route path="complaints" element={<ComplaintsPage />} />
            <Route path="complaints/new" element={<ComplaintApplyPage />} />
            <Route path="complaints/:id" element={<ComplaintDetailPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="meals" element={<MealsPage />} />
            <Route path="meals/:id/qr" element={<MealQrPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="profile/edit" element={<EditProfilePage />} />
            <Route path="profile/notifications" element={<NotificationSettingsPage />} />
          </Route>

          <Route path="/admin" element={<ProtectedLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudentsPage />} />
            <Route path="students/admit" element={<AdminStudentAdmitPage />} />
            <Route path="students/:id" element={<AdminStudentDetailPage />} />
            <Route path="rooms" element={<AdminRoomsPage />} />
            <Route path="rooms/:id" element={<AdminRoomDetailPage />} />
            <Route path="leaves" element={<AdminLeavesPage />} />
            <Route path="leaves/:id" element={<AdminLeaveDetailPage />} />
            <Route path="complaints" element={<AdminComplaintsPage />} />
            <Route path="complaints/:id" element={<AdminComplaintDetailPage />} />
            <Route path="notices" element={<AdminNoticesPage />} />
            <Route path="notices/new" element={<AdminNoticeFormPage />} />
            <Route path="notices/:id" element={<AdminNoticeFormPage />} />
            <Route path="scanners" element={<AdminScannerHubPage />} />
            <Route path="scanners/mess-girls" element={<AdminScannerPage mode="mess-girls" />} />
            <Route path="scanners/mess-boys" element={<AdminScannerPage mode="mess-boys" />} />
            <Route path="scanners/leave-checkout" element={<AdminScannerPage mode="leave-checkout" />} />
            <Route path="scanners/leave-checkin" element={<AdminScannerPage mode="leave-checkin" />} />
            <Route path="profile" element={<AdminProfilePage />} />
            <Route path="profile/edit" element={<AdminEditProfilePage />} />
            <Route path="profile/password" element={<AdminChangePasswordPage />} />
            <Route path="profile/notifications" element={<AdminNotificationSettingsPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
