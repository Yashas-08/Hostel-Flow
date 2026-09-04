import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminScreen from '../../components/admin/AdminScreen';
import { Card } from '../../components/primitives';

function MessIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v6a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 11v10M17 3c-1.5 1.5-2 3-2 5s.5 3 2 3 2-1 2-3-.5-3.5-2-5Z" />
      <path d="M17 11v10" />
    </svg>
  );
}
function CheckOutIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function CheckInIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 21h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-4" />
      <path d="M8 17l-5-5 5-5M3 12h12" />
    </svg>
  );
}

const SCANNERS = [
  {
    key: 'mess-girls',
    label: 'Girls Mess Scanner',
    description: 'Verify a meal QR — female students only',
    to: '/admin/scanners/mess-girls',
    icon: <MessIcon />,
  },
  {
    key: 'mess-boys',
    label: 'Boys Mess Scanner',
    description: 'Verify a meal QR — male students only',
    to: '/admin/scanners/mess-boys',
    icon: <MessIcon />,
  },
  {
    key: 'leave-checkin',
    label: 'Leave Check-In Scanner',
    description: 'Record a student returning to the hostel',
    to: '/admin/scanners/leave-checkin',
    icon: <CheckInIcon />,
  },
  {
    key: 'leave-checkout',
    label: 'Leave Check-Out Scanner',
    description: 'Record a student leaving the hostel',
    to: '/admin/scanners/leave-checkout',
    icon: <CheckOutIcon />,
  },
];

export default function AdminScannerHubPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <AdminHeader name={user?.fullName ?? ''} title="Meal & Movement Scanners" />
      <AdminScreen>
        <div className="pb-4 lg:hidden">
          <h1 className="font-display font-bold text-2xl text-[var(--color-ink)]">Scanners</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:max-w-2xl">
          {SCANNERS.map((s) => (
            <button key={s.key} type="button" onClick={() => navigate(s.to)} className="text-left">
              <Card className="flex items-start gap-3 active:bg-[var(--color-primary-soft)] transition-colors h-full">
                <span className="text-[var(--color-primary)] shrink-0">{s.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{s.label}</p>
                  <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{s.description}</p>
                </div>
              </Card>
            </button>
          ))}
        </div>
      </AdminScreen>
    </>
  );
}
